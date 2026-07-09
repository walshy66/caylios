"""COA-277/279/281/285: destination adapters against mocked provider APIs."""

import json

import httpx
import pytest

from app.connectors import (
    GoogleDriveAdapter,
    HubSpotAdapter,
    PandaDocAdapter,
    XeroAdapter,
    build_authorize_url,
    exchange_authorization_code,
    make_refresher,
)
from app.destinations import DestinationError

FIELDS = {
    "full_name": "Jane Citizen",
    "email": "jane@example.com",
    "phone": "0400 000 000",
    "business_name": "Citizen Consulting",
    "services_needed": "Tax structuring",
}
CONTEXT = {"workflow_run_id": "run-1", "workspace_id": "ws-a", "connection": {}}


def transport(routes):
    """routes: list of (method, path-substring, response_factory(request))."""
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        for method, fragment, factory in routes:
            if request.method == method and fragment in str(request.url):
                return factory(request)
        return httpx.Response(404, json={"error": "unmatched route"})

    return httpx.Client(transport=httpx.MockTransport(handler)), calls


def test_hubspot_creates_contact_and_associated_deal():
    client, calls = transport(
        [
            ("POST", "/crm/v3/objects/contacts", lambda r: httpx.Response(201, json={"id": "301"})),
            ("POST", "/crm/v3/objects/deals", lambda r: httpx.Response(201, json={"id": "9001"})),
        ]
    )

    record_id = HubSpotAdapter(client).push("token-1", FIELDS, CONTEXT)

    assert record_id == "contact:301,deal:9001"
    contact_body = json.loads(calls[0].content)
    assert contact_body["properties"]["email"] == "jane@example.com"
    assert contact_body["properties"]["firstname"] == "Jane"
    assert calls[0].headers["authorization"] == "Bearer token-1"
    deal_body = json.loads(calls[1].content)
    assert deal_body["associations"][0]["to"]["id"] == "301"


def test_hubspot_contact_failure_is_readable():
    client, _ = transport(
        [("POST", "/crm/v3/objects/contacts", lambda r: httpx.Response(400, json={"message": "bad email"}))]
    )

    with pytest.raises(DestinationError, match="HubSpot contact creation failed \\(400\\)"):
        HubSpotAdapter(client).push("token-1", FIELDS, CONTEXT)


def test_google_drive_creates_client_folder(monkeypatch):
    monkeypatch.setenv("STS_GOOGLE_DRIVE_PARENT_FOLDER_ID", "parent-123")
    client, calls = transport(
        [("POST", "/drive/v3/files", lambda r: httpx.Response(200, json={"id": "folder-77"}))]
    )

    record_id = GoogleDriveAdapter(client).push("token-g", FIELDS, CONTEXT)

    assert record_id == "folder:folder-77"
    body = json.loads(calls[0].content)
    assert body["name"] == "Jane Citizen"
    assert body["mimeType"] == "application/vnd.google-apps.folder"
    assert body["parents"] == ["parent-123"]


def test_pandadoc_requires_template_configuration(monkeypatch):
    monkeypatch.delenv("STS_PANDADOC_TEMPLATE_ID", raising=False)
    client, _ = transport([])

    with pytest.raises(DestinationError, match="template is not configured"):
        PandaDocAdapter(client).push("token-p", FIELDS, CONTEXT)


def test_pandadoc_creates_onboarding_document(monkeypatch):
    monkeypatch.setenv("STS_PANDADOC_TEMPLATE_ID", "tmpl-1")
    client, calls = transport(
        [("POST", "/public/v1/documents", lambda r: httpx.Response(201, json={"id": "pd-55"}))]
    )

    record_id = PandaDocAdapter(client).push("token-p", FIELDS, CONTEXT)

    assert record_id == "document:pd-55"
    body = json.loads(calls[0].content)
    assert body["template_uuid"] == "tmpl-1"
    assert body["recipients"][0]["email"] == "jane@example.com"
    assert {"name": "services_needed", "value": "Tax structuring"} in body["tokens"]


def test_xero_requires_tenant_id():
    client, _ = transport([])

    with pytest.raises(DestinationError, match="tenant id"):
        XeroAdapter(client).push("token-x", FIELDS, CONTEXT)


def test_xero_creates_contact_and_draft_invoice():
    client, calls = transport(
        [
            (
                "POST",
                "/api.xro/2.0/Contacts",
                lambda r: httpx.Response(200, json={"Contacts": [{"ContactID": "c-1"}]}),
            ),
            (
                "POST",
                "/api.xro/2.0/Invoices",
                lambda r: httpx.Response(200, json={"Invoices": [{"InvoiceID": "inv-1"}]}),
            ),
        ]
    )
    context = {**CONTEXT, "connection": {"external_account_label": "tenant-abc"}}

    record_id = XeroAdapter(client).push("token-x", FIELDS, context)

    assert record_id == "contact:c-1,invoice:inv-1"
    assert calls[0].headers["xero-tenant-id"] == "tenant-abc"
    invoice_body = json.loads(calls[1].content)
    assert invoice_body["Invoices"][0]["Status"] == "DRAFT"
    assert invoice_body["Invoices"][0]["Contact"]["ContactID"] == "c-1"


def test_authorize_url_includes_client_id_and_state(monkeypatch):
    monkeypatch.setenv("STS_HUBSPOT_CLIENT_ID", "hub-client")
    monkeypatch.setenv("STS_HUBSPOT_CLIENT_SECRET", "hub-secret")

    url = build_authorize_url("hubspot", redirect_uri="https://caylios.example/callback", state="ws:nonce")

    assert url.startswith("https://app.hubspot.com/oauth/authorize?")
    assert "client_id=hub-client" in url
    assert "state=ws%3Anonce" in url


def test_authorize_url_without_credentials_fails(monkeypatch):
    monkeypatch.delenv("STS_XERO_CLIENT_ID", raising=False)

    with pytest.raises(DestinationError, match="credentials are not configured"):
        build_authorize_url("xero", redirect_uri="https://caylios.example/callback", state="s")


def test_code_exchange_returns_token_fields(monkeypatch):
    monkeypatch.setenv("STS_GOOGLE_DRIVE_CLIENT_ID", "g-client")
    monkeypatch.setenv("STS_GOOGLE_DRIVE_CLIENT_SECRET", "g-secret")
    client, calls = transport(
        [
            (
                "POST",
                "oauth2.googleapis.com/token",
                lambda r: httpx.Response(
                    200,
                    json={
                        "access_token": "fresh-access",
                        "refresh_token": "fresh-refresh",
                        "expires_in": 3600,
                        "scope": "drive.file",
                    },
                ),
            )
        ]
    )

    tokens = exchange_authorization_code("google_drive", "auth-code", "https://caylios.example/cb", client=client)

    assert tokens["access_token"] == "fresh-access"
    assert tokens["refresh_token"] == "fresh-refresh"
    body = dict(httpx.QueryParams(calls[0].content.decode()))
    assert body["grant_type"] == "authorization_code"
    assert body["code"] == "auth-code"


def test_refresher_rotates_tokens(monkeypatch):
    monkeypatch.setenv("STS_XERO_CLIENT_ID", "x-client")
    monkeypatch.setenv("STS_XERO_CLIENT_SECRET", "x-secret")
    client, _ = transport(
        [
            (
                "POST",
                "identity.xero.com/connect/token",
                lambda r: httpx.Response(
                    200, json={"access_token": "rotated", "refresh_token": "rotated-refresh", "expires_in": 1800}
                ),
            )
        ]
    )

    refresher = make_refresher("xero", client=client)
    refreshed = refresher("old-refresh")

    assert refreshed["access_token"] == "rotated"
    assert refreshed["refresh_token"] == "rotated-refresh"
    assert refreshed["token_expires_at"] is not None


def test_refresher_absent_without_credentials(monkeypatch):
    monkeypatch.delenv("STS_PANDADOC_CLIENT_ID", raising=False)
    monkeypatch.delenv("STS_PANDADOC_CLIENT_SECRET", raising=False)

    assert make_refresher("pandadoc") is None

from types import SimpleNamespace

from xai_helpers import extract_document_id


def test_extract_document_id_prefers_document_id():
    resp = SimpleNamespace(document_id="doc-123")
    assert extract_document_id(resp) == "doc-123"


def test_extract_document_id_file_metadata():
    resp = SimpleNamespace(file_metadata=SimpleNamespace(file_id="file-456"))
    assert extract_document_id(resp) == "file-456"


def test_extract_document_id_file_id_fallback():
    resp = SimpleNamespace(file_id="file-789")
    assert extract_document_id(resp) == "file-789"


def test_extract_document_id_none():
    resp = SimpleNamespace()
    assert extract_document_id(resp) is None

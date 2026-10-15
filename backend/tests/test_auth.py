import pytest
from app.auth import hash_password, verify_password, create_access_token, decode_access_token

def test_password_hashing():
    pwd = "SecureStudentPass123!"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_jwt_token_flow():
    payload = {"sub": "student-123", "email": "student@university.edu"}
    token = create_access_token(payload)
    assert isinstance(token, str)
    
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "student-123"
    assert decoded["email"] == "student@university.edu"
    assert "exp" in decoded

def test_invalid_jwt():
    assert decode_access_token("invalid.token.signature") is None

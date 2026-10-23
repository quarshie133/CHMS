"""Ghana mobile number validation and normalisation to E.164 (+233XXXXXXXXX)."""

import re

# Mobile network prefixes (first two digits of the 9-digit national number).
GHANA_MOBILE_PREFIXES = {"20", "23", "24", "25", "26", "27", "28", "50", "53", "54", "55", "56", "57", "59"}

_STRIP = re.compile(r"[\s\-().]")


class InvalidPhoneNumber(ValueError):
    pass


def normalize_ghana_phone(raw: str) -> str:
    """
    Return the number as +233XXXXXXXXX or raise InvalidPhoneNumber.

    Accepted inputs: +233241234567, 233241234567, 00233241234567,
    0241234567 (local format) and 241234567 (no trunk prefix).
    """
    if raw is None:
        raise InvalidPhoneNumber("No phone number provided.")
    value = _STRIP.sub("", str(raw))
    if not value:
        raise InvalidPhoneNumber("No phone number provided.")

    if value.startswith("+"):
        digits = value[1:]
        if not digits.isdigit() or not digits.startswith("233"):
            raise InvalidPhoneNumber("Only Ghana numbers starting with +233 are supported.")
        national = digits[3:]
    elif not value.isdigit():
        raise InvalidPhoneNumber("Phone numbers may only contain digits and a leading +.")
    elif value.startswith("00233"):
        national = value[5:]
    elif value.startswith("233") and len(value) == 12:
        national = value[3:]
    elif value.startswith("0") and len(value) == 10:
        national = value[1:]
    elif len(value) == 9:
        national = value
    else:
        raise InvalidPhoneNumber("Enter a Ghana mobile number such as +233241234567 or 0241234567.")

    if len(national) != 9:
        raise InvalidPhoneNumber("Ghana mobile numbers have 9 digits after +233.")
    if national[:2] not in GHANA_MOBILE_PREFIXES:
        raise InvalidPhoneNumber(f"+233 {national[:2]}… is not a recognised Ghana mobile prefix.")
    return f"+233{national}"


def try_normalize_ghana_phone(raw: str) -> str | None:
    try:
        return normalize_ghana_phone(raw)
    except InvalidPhoneNumber:
        return None


def mask_phone(e164: str) -> str:
    """+233241234567 -> +233 24 *** 4567 (for staff who shouldn't see full numbers)."""
    if not e164 or len(e164) < 8:
        return "***"
    return f"{e164[:4]} {e164[4:6]} *** {e164[-4:]}"

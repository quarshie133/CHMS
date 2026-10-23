"""SMS length and segment calculation (GSM-7 vs UCS-2)."""

GSM7 = set(
    "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"
)
GSM7_EXT = set("^{}\\[~]|€")


def sms_segments(text: str) -> dict:
    units = 0
    gsm = True
    for ch in text:
        if ch in GSM7:
            units += 1
        elif ch in GSM7_EXT:
            units += 2
        else:
            gsm = False
            break
    if not gsm:
        length = len(text)
        segments = 0 if length == 0 else 1 if length <= 70 else -(-length // 67)
        return {"encoding": "unicode", "length": length, "segments": segments}
    segments = 0 if units == 0 else 1 if units <= 160 else -(-units // 153)
    return {"encoding": "gsm7", "length": units, "segments": segments}

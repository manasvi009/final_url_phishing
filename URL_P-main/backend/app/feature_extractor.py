# backend/app/feature_extractor.py

import re
from urllib.parse import urlparse, unquote
import tldextract
import validators


# Common URL shorteners (often abused). This is a small starter list.
SHORTENER_DOMAINS = {
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly",
    "cutt.ly", "rebrand.ly", "rb.gy", "shorturl.at", "shorte.st", "bitly.com"
}

SUSPICIOUS_TLDS = {
    "zip", "mov", "kim", "country", "stream", "gq", "tk", "top", "xyz", "monster",
    "work", "click", "link", "biz", "info"
}

BRAND_WORDS = {
    # common brand bait words (starter set)
    "google", "gmail", "facebook", "instagram", "whatsapp", "paypal", "apple",
    "microsoft", "netflix", "amazon", "bank", "secure", "login", "signin",
    "verify", "update", "account", "billing", "support"
}


_ip_regex = re.compile(r"(?:(?:\d{1,3}\.){3}\d{1,3})")
_hex_ip_regex = re.compile(r"(?:0x[0-9a-fA-F]{1,2}\.){3}0x[0-9a-fA-F]{1,2}")
_port_regex = re.compile(r":\d{2,5}(?:/|$)")


def _safe_str(x) -> str:
    return "" if x is None else str(x).strip()


def _normalize_url(url: str) -> str:
    """
    Make URL parse-friendly.
    - add scheme if missing
    - strip spaces
    """
    url = _safe_str(url)
    if not url:
        return ""
    if not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", url):
        # If scheme missing, assume http
        url = "http://" + url
    return url


def extract_features(url: str) -> dict:
    """
    Convert a URL string into numeric features for ML.
    Returns a dict of feature_name -> value (int/float).
    Compatible with scikit-learn/pandas.
    """
    original = _safe_str(url)
    norm = _normalize_url(original)

    # Basic validity
    is_valid = 1 if (norm and validators.url(norm)) else 0

    # Parse
    try:
        p = urlparse(norm)
    except Exception:
        p = urlparse("http://invalid")

    scheme = (p.scheme or "").lower()
    netloc = (p.netloc or "").lower()
    path = p.path or ""
    query = p.query or ""
    fragment = p.fragment or ""

    # Remove credentials if present: user:pass@host
    host_port = netloc.split("@")[-1]
    host = host_port.split(":")[0]
    port_present = 1 if _port_regex.search(host_port) else 0

    # tld extraction (handles subdomains well)
    ext = tldextract.extract(host)
    subdomain = ext.subdomain or ""
    domain = ext.domain or ""
    suffix = ext.suffix or ""

    # Decode URL once for token analysis
    decoded = unquote(original)

    # Helper counts
    def count_in(s: str, ch: str) -> int:
        return s.count(ch)

    # Character-level signals
    url_len = len(original)
    host_len = len(host)
    path_len = len(path)
    query_len = len(query)
    fragment_len = len(fragment)

    num_dots = count_in(original, ".")
    num_hyphens = count_in(original, "-")
    num_underscores = count_in(original, "_")
    num_slashes = count_in(original, "/")
    num_question = count_in(original, "?")
    num_equal = count_in(original, "=")
    num_amp = count_in(original, "&")
    num_percent = count_in(original, "%")
    num_at = count_in(original, "@")
    num_hash = count_in(original, "#")

    num_digits = sum(c.isdigit() for c in original)
    digit_ratio = (num_digits / url_len) if url_len > 0 else 0.0

    # Suspicious patterns
    has_ip = 1 if _ip_regex.search(host) else 0
    has_hex_ip = 1 if _hex_ip_regex.search(host) else 0

    # multiple "http" in the URL text (phishing trick)
    http_count = len(re.findall(r"http", original.lower()))
    has_http_in_path = 1 if "http" in (path.lower() + query.lower()) else 0

    # "//" beyond scheme can indicate redirection tricks
    # e.g. http://good.com//evil.com/login
    double_slash_after_scheme = 0
    try:
        after_scheme = norm.split("://", 1)[1]
        double_slash_after_scheme = 1 if "//" in after_scheme else 0
    except Exception:
        double_slash_after_scheme = 0

    # Punycode (xn--)
    has_punycode = 1 if "xn--" in host else 0

    # HTTPS usage
    is_https = 1 if scheme == "https" else 0

    # Subdomain depth
    subdomain_levels = 0 if not subdomain else subdomain.count(".") + 1

    # brand words in host/path (often used to imitate)
    lowered_all = (host + " " + path + " " + query).lower()
    brand_word_hits = sum(1 for w in BRAND_WORDS if w in lowered_all)

    # Shortener domain
    base_domain = ".".join([domain, suffix]) if domain and suffix else host
    is_shortener = 1 if base_domain in SHORTENER_DOMAINS else 0

    # TLD risky flag
    tld = suffix.split(".")[-1] if suffix else ""
    is_suspicious_tld = 1 if tld in SUSPICIOUS_TLDS else 0

    # Host contains hyphen (common in fake domains)
    host_has_hyphen = 1 if "-" in host else 0

    # Use of '@' indicates possible credentials trick
    has_at_symbol = 1 if "@" in original else 0

    # Count of sensitive tokens often used in phishing paths
    sensitive_tokens = ["login", "signin", "verify", "update", "secure", "account", "banking", "password"]
    sensitive_token_hits = sum(1 for t in sensitive_tokens if t in (path.lower() + " " + query.lower()))

    # Shannon entropy (simple proxy for randomness/obfuscation)
    # Higher entropy may indicate obfuscated URLs
    def shannon_entropy(s: str) -> float:
        if not s:
            return 0.0
        from math import log2
        freq = {}
        for ch in s:
            freq[ch] = freq.get(ch, 0) + 1
        ent = 0.0
        n = len(s)
        for c in freq.values():
            p_ = c / n
            ent -= p_ * log2(p_)
        return ent

    url_entropy = shannon_entropy(original)
    host_entropy = shannon_entropy(host)

    # Return feature dict (all numeric)
    return {
        # validity
        "is_valid_url": is_valid,

        # scheme / security
        "is_https": is_https,
        "port_present": port_present,

        # length features
        "url_length": url_len,
        "host_length": host_len,
        "path_length": path_len,
        "query_length": query_len,
        "fragment_length": fragment_len,

        # structural counts
        "num_dots": num_dots,
        "num_hyphens": num_hyphens,
        "num_underscores": num_underscores,
        "num_slashes": num_slashes,
        "num_question": num_question,
        "num_equal": num_equal,
        "num_ampersand": num_amp,
        "num_percent": num_percent,
        "num_at": num_at,
        "num_hash": num_hash,

        # digit features
        "num_digits": num_digits,
        "digit_ratio": float(digit_ratio),

        # domain parts
        "subdomain_levels": subdomain_levels,
        "subdomain_length": len(subdomain),
        "domain_length": len(domain),
        "tld_length": len(suffix),

        # suspicious patterns
        "has_ip": has_ip,
        "has_hex_ip": has_hex_ip,
        "http_count": http_count,
        "has_http_in_path": has_http_in_path,
        "double_slash_after_scheme": double_slash_after_scheme,
        "has_punycode": has_punycode,
        "host_has_hyphen": host_has_hyphen,
        "has_at_symbol": has_at_symbol,

        # heuristics
        "brand_word_hits": brand_word_hits,
        "is_shortener": is_shortener,
        "is_suspicious_tld": is_suspicious_tld,
        "sensitive_token_hits": sensitive_token_hits,

        # entropy
        "url_entropy": float(url_entropy),
        "host_entropy": float(host_entropy),
    }


def extract_features_df(urls):
    """
    Convenience helper:
    urls: iterable of url strings
    returns: list[dict] (easy to wrap with pd.DataFrame)
    """
    return [extract_features(u) for u in urls]
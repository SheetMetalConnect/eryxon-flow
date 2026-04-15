"""Loads the CADEXsoft MTK license, if available, and activates it.

The real license module is delivered by CADEXsoft as a Python source file that
exports a ``value()`` function returning the license string. We keep that file
outside the Docker image (mounted at runtime) so wheel builds can be cached
independently of license rotation.

If either the license module or the ``manufacturing_toolkit`` package cannot
be imported we fall back to stub mode — the HTTP surface still works, which
lets the frontend integration be built and exercised before a real license
arrives.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Optional

log = logging.getLogger("cadexsoft.license")


@dataclass(frozen=True)
class LicenseStatus:
    mtk_available: bool
    license_activated: bool
    mtk_version: Optional[str]
    error: Optional[str]

    @property
    def stub_mode(self) -> bool:
        return not (self.mtk_available and self.license_activated)


def _load_license_string() -> Optional[str]:
    try:
        import mtk_license  # type: ignore
    except ImportError as exc:
        log.warning("mtk_license module not importable: %s", exc)
        return None
    try:
        value = mtk_license.value()  # type: ignore[attr-defined]
    except Exception as exc:  # pragma: no cover - depends on customer file
        log.error("mtk_license.value() raised: %s", exc)
        return None
    if not isinstance(value, str) or not value.strip():
        log.error("mtk_license.value() returned non-string or empty value")
        return None
    if "REPLACE_ME" in value:
        log.warning("mtk_license appears to still be the placeholder example")
        return None
    return value


def activate() -> LicenseStatus:
    """Attempt to import MTK and activate the license.

    Never raises — returns a structured status so ``/health`` can report what
    the integration host sees without crashing the whole service.
    """
    if os.getenv("CADEXSOFT_FORCE_STUB", "").lower() in ("1", "true", "yes"):
        return LicenseStatus(False, False, None, "CADEXSOFT_FORCE_STUB is set")

    try:
        import manufacturing_toolkit as mtk  # type: ignore
    except ImportError as exc:
        return LicenseStatus(False, False, None, f"manufacturing_toolkit not installed: {exc}")

    license_str = _load_license_string()
    if license_str is None:
        return LicenseStatus(True, False, getattr(mtk, "__version__", None),
                             "license module missing or placeholder")

    try:
        # The MTK Python API exposes a LicenseManager. The exact module path
        # can vary across releases; try the documented one and fall back.
        try:
            from manufacturing_toolkit.core import LicenseManager  # type: ignore
        except ImportError:
            from manufacturing_toolkit import LicenseManager  # type: ignore
        LicenseManager.Activate(license_str)
    except Exception as exc:  # pragma: no cover - depends on licensed SDK
        return LicenseStatus(True, False, getattr(mtk, "__version__", None), str(exc))

    return LicenseStatus(True, True, getattr(mtk, "__version__", None), None)

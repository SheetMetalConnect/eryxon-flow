#!/usr/bin/env python3
"""
Test Handle_TDocStd_Document availability in pythonocc-core.

This script checks if the current pythonocc-core version exposes
Handle_TDocStd_Document, which is required for XCAF document creation
and PMI extraction.

Usage:
    python test_handle.py
    python test_handle.py --verbose
"""

import argparse
import sys


def check_handle_availability(verbose: bool = False) -> bool:
    """Check if Handle_TDocStd_Document is available."""
    try:
        from OCC.Core import TDocStd

        # Get all exports from TDocStd module
        exports = dir(TDocStd)

        if verbose:
            print("TDocStd module exports:")
            for name in sorted(exports):
                if not name.startswith("_"):
                    print(f"  {name}")
            print()

        # Check for Handle_TDocStd_Document
        has_handle = "Handle_TDocStd_Document" in exports

        # Also check alternative patterns
        handle_patterns = [
            "Handle_TDocStd_Document",
            "TDocStd_Document",
        ]

        found = []
        for pattern in handle_patterns:
            if pattern in exports:
                found.append(pattern)

        print(f"pythonocc TDocStd exports found: {', '.join(found) or 'None relevant'}")
        print(f"Handle_TDocStd_Document available: {has_handle}")

        return has_handle

    except ImportError as e:
        print(f"ERROR: pythonocc-core not installed: {e}")
        return False
    except Exception as e:
        print(f"ERROR: {e}")
        return False


def test_xcaf_document_creation(verbose: bool = False) -> bool:
    """Test if XCAF document creation works."""
    try:
        from OCC.Core.TCollection import TCollection_ExtendedString
        from OCC.Core.XCAFApp import XCAFApp_Application

        fmt = TCollection_ExtendedString("MDTV-XCAF")
        app = XCAFApp_Application.GetApplication()

        # Method 1: NewDocument returning handle directly
        try:
            result = app.NewDocument(fmt)
            if result is not None:
                if hasattr(result, "GetObject"):
                    doc = result.GetObject()
                    if doc is not None and hasattr(doc, "Main"):
                        main = doc.Main()
                        if not (hasattr(main, "IsNull") and main.IsNull()):
                            print("XCAF document creation: SUCCESS (NewDocument returns handle)")
                            return True
                elif hasattr(result, "Main"):
                    main = result.Main()
                    if not (hasattr(main, "IsNull") and main.IsNull()):
                        print("XCAF document creation: SUCCESS (NewDocument returns document)")
                        return True
        except Exception as e:
            if verbose:
                print(f"  Method 1 (NewDocument) failed: {e}")

        # Method 2: Using Handle_TDocStd_Document
        try:
            from OCC.Core.TDocStd import Handle_TDocStd_Document

            h_doc = Handle_TDocStd_Document()
            app.NewDocument(fmt, h_doc)
            if not h_doc.IsNull():
                doc = h_doc.GetObject()
                if doc is not None and hasattr(doc, "Main"):
                    main = doc.Main()
                    if not (hasattr(main, "IsNull") and main.IsNull()):
                        print("XCAF document creation: SUCCESS (Handle_TDocStd_Document)")
                        return True
        except ImportError:
            if verbose:
                print("  Method 2: Handle_TDocStd_Document not available")
        except Exception as e:
            if verbose:
                print(f"  Method 2 (Handle) failed: {e}")

        # Method 3: TDocStd_Document directly
        try:
            from OCC.Core.TDocStd import TDocStd_Document

            doc = TDocStd_Document(fmt)
            # Try to register with app
            try:
                app.NewDocument(fmt, doc)
            except Exception:
                pass  # May fail but document might still be usable

            if hasattr(doc, "Main"):
                main = doc.Main()
                if not (hasattr(main, "IsNull") and main.IsNull()):
                    print("XCAF document creation: SUCCESS (TDocStd_Document direct)")
                    return True
        except Exception as e:
            if verbose:
                print(f"  Method 3 (TDocStd_Document) failed: {e}")

        print("XCAF document creation: FAILED (all methods)")
        return False

    except ImportError as e:
        print(f"ERROR: Required OCC modules not available: {e}")
        return False
    except Exception as e:
        print(f"ERROR: {e}")
        return False


def test_pmi_tools(verbose: bool = False) -> bool:
    """Test if PMI tools are accessible."""
    try:
        from OCC.Core.TCollection import TCollection_ExtendedString
        from OCC.Core.XCAFApp import XCAFApp_Application
        from OCC.Core.XCAFDoc import XCAFDoc_DocumentTool
        from OCC.Core.TDF import TDF_LabelSequence

        # First create a document
        fmt = TCollection_ExtendedString("MDTV-XCAF")
        app = XCAFApp_Application.GetApplication()

        doc = None

        # Try each method
        try:
            from OCC.Core.TDocStd import Handle_TDocStd_Document
            h_doc = Handle_TDocStd_Document()
            app.NewDocument(fmt, h_doc)
            if not h_doc.IsNull():
                doc = h_doc.GetObject()
        except Exception:
            pass

        if doc is None:
            try:
                result = app.NewDocument(fmt)
                if result is not None:
                    if hasattr(result, "GetObject"):
                        doc = result.GetObject()
                    elif hasattr(result, "Main"):
                        doc = result
            except Exception:
                pass

        if doc is None:
            print("PMI tools test: SKIPPED (no valid document)")
            return False

        main_label = doc.Main()

        # Test DimTolTool
        try:
            dim_tol_tool = XCAFDoc_DocumentTool.DimTolTool(main_label)
            if dim_tol_tool is not None:
                # Try to get labels
                dim_labels = TDF_LabelSequence()
                dim_tol_tool.GetDimensionLabels(dim_labels)

                tol_labels = TDF_LabelSequence()
                dim_tol_tool.GetGeomToleranceLabels(tol_labels)

                datum_labels = TDF_LabelSequence()
                dim_tol_tool.GetDatumLabels(datum_labels)

                print("PMI tools test: SUCCESS")
                print(f"  DimTolTool: available")
                print(f"  GetDimensionLabels: works")
                print(f"  GetGeomToleranceLabels: works")
                print(f"  GetDatumLabels: works")
                return True
        except Exception as e:
            if verbose:
                print(f"  DimTolTool test failed: {e}")

        print("PMI tools test: FAILED")
        return False

    except Exception as e:
        print(f"PMI tools test: ERROR - {e}")
        return False


def get_pythonocc_version() -> str:
    """Get installed pythonocc-core version."""
    try:
        import OCC
        return getattr(OCC, "__version__", "unknown")
    except Exception:
        return "not installed"


def main():
    parser = argparse.ArgumentParser(
        description="Test Handle_TDocStd_Document availability"
    )
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    args = parser.parse_args()

    print("=" * 60)
    print("pythonocc-core Handle_TDocStd_Document Test")
    print("=" * 60)

    version = get_pythonocc_version()
    print(f"\npythonocc-core version: {version}")
    print()

    # Run tests
    handle_ok = check_handle_availability(args.verbose)
    print()

    doc_ok = test_xcaf_document_creation(args.verbose)
    print()

    pmi_ok = test_pmi_tools(args.verbose)
    print()

    # Summary
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Handle_TDocStd_Document: {'AVAILABLE' if handle_ok else 'NOT AVAILABLE'}")
    print(f"XCAF document creation:  {'WORKS' if doc_ok else 'FAILS'}")
    print(f"PMI tools accessible:    {'YES' if pmi_ok else 'NO'}")
    print()

    if doc_ok and pmi_ok:
        print("PMI extraction should work with this version.")
        sys.exit(0)
    else:
        print("PMI extraction will NOT work with this version.")
        print("Try a different pythonocc-core version.")
        sys.exit(1)


if __name__ == "__main__":
    main()

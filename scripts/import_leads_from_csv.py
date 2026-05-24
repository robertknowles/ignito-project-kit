"""
import_leads_from_csv.py

Parses the PropPath_Industry_Map CSV and emits two Supabase-ready CSVs:
  - companies.csv  -> public.crm_companies
  - contacts.csv   -> public.crm_contacts (foreign keyed by company_id UUID)

The input CSV has a single "Known Contact LinkedIns" cell per company containing
multiple newline-separated entries. Each entry is one of:
  - "<full_name> (<title>): <linkedin_url>"
  - "<linkedin_url>"   (bare URL, no name/title metadata)

This script normalises every entry into its own contact row, infers titles where
they're embedded, derives a relevance tier from the "Rating" column ("(1) High"
-> "high"), computes a size_tier from the employee count, and assigns stable
UUIDs so both CSVs can be imported into Supabase Studio with foreign keys intact.

Usage:
    python3 import_leads_from_csv.py <input_csv> [--out-dir <dir>]

Defaults to writing companies.csv and contacts.csv into the current directory.
"""

import argparse
import csv
import re
import uuid
from pathlib import Path
from typing import List, Tuple, Optional


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------

RELEVANCE_PATTERN = re.compile(r"\((\d+)\)\s*(\w+)", re.IGNORECASE)
URL_PATTERN = re.compile(r"https?://[^\s,;]+", re.IGNORECASE)
# "Name (Title): http://..." OR "Name (Title with: colons): http://..."
LABELLED_PATTERN = re.compile(
    r"^\s*(?P<name>[^()]+?)\s*\((?P<title>[^)]+)\)\s*:\s*(?P<url>https?://\S+)\s*$"
)


def parse_relevance_tier(raw: str) -> str:
    """
    "(1) High"   -> "high"
    "(2) Medium" -> "medium"
    "(3) Low"    -> "low"
    Anything else falls through to "medium".
    """
    if not raw:
        return "medium"
    match = RELEVANCE_PATTERN.search(raw)
    if match:
        word = match.group(2).lower()
        if word in {"high", "medium", "low"}:
            return word
    # also accept plain "High"/"Medium"/"Low"
    word = raw.strip().lower()
    if word in {"high", "medium", "low"}:
        return word
    return "medium"


def parse_employees(raw: str) -> Optional[int]:
    if not raw:
        return None
    digits = re.sub(r"[^0-9]", "", raw)
    return int(digits) if digits else None


def parse_contact_line(line: str) -> Optional[Tuple[str, Optional[str], str]]:
    """
    Returns (full_name, title_or_none, url) or None if the line has no URL.

    Handles three shapes:
      "Scott Kuru (Founder & CEO): http://www.linkedin.com/in/scott-kuru-7a44a421"
      "http://www.linkedin.com/in/scott-kuru-7a44a421"
      "Scott Kuru: http://www.linkedin.com/in/scott-kuru-7a44a421"   (rare, no title)
    """
    line = line.strip().strip(",")
    if not line:
        return None

    # Shape 1: labelled with title in parens
    match = LABELLED_PATTERN.match(line)
    if match:
        return (
            match.group("name").strip(),
            match.group("title").strip(),
            match.group("url").strip(),
        )

    # Shape 3: "Name: URL" (no parens for title)
    if ":" in line and "http" in line:
        head, _, tail = line.partition(":")
        url_match = URL_PATTERN.search(tail)
        if url_match and head.strip() and not head.strip().lower().startswith("http"):
            return (head.strip(), None, url_match.group(0))

    # Shape 2: bare URL
    url_match = URL_PATTERN.search(line)
    if url_match:
        url = url_match.group(0)
        full_name = name_from_slug(url)
        return (full_name, None, url)

    return None


def name_from_slug(url: str) -> str:
    """
    Best-effort full name extraction from a LinkedIn vanity URL when no label
    is provided. Pulls the slug after /in/ and title-cases it minus the trailing
    hash.

    "http://www.linkedin.com/in/scott-kuru-7a44a421"   -> "Scott Kuru"
    "http://www.linkedin.com/in/davidmorrison"         -> "Davidmorrison"
    "http://www.linkedin.com/in/sebastien-bouthillette" -> "Sebastien Bouthillette"
    """
    slug_match = re.search(r"/in/([^/?#]+)", url)
    if not slug_match:
        return "Unknown"
    slug = slug_match.group(1)
    # Strip a trailing alphanumeric hash that LinkedIn often appends
    parts = slug.split("-")
    cleaned = [p for p in parts if not (len(p) >= 6 and any(c.isdigit() for c in p))]
    if not cleaned:
        cleaned = parts
    return " ".join(p.capitalize() for p in cleaned) or "Unknown"


def size_tier_from_employees(employees: Optional[int]) -> str:
    if employees is None:
        return "small"
    if employees < 50:
        return "small"
    if employees < 150:
        return "mid"
    return "whale"


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------


def process(input_path: Path, out_dir: Path) -> Tuple[int, int]:
    out_dir.mkdir(parents=True, exist_ok=True)

    companies_rows: List[dict] = []
    contacts_rows: List[dict] = []

    with input_path.open(newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for raw in reader:
            company_name = (raw.get("Company Name") or "").strip()
            if not company_name:
                continue

            company_id = str(uuid.uuid4())
            employees = parse_employees(raw.get("Employees") or "")
            relevance_tier = parse_relevance_tier(raw.get("Rating") or "")

            companies_rows.append(
                {
                    "id": company_id,
                    "name": company_name,
                    "relevance_tier": relevance_tier,
                    "employees": employees if employees is not None else "",
                    "size_tier_hint": size_tier_from_employees(employees),
                    "state": (raw.get("State") or "").strip(),
                    "website": (raw.get("Website") or "").strip(),
                    "blurb": (raw.get("Investment Focus Blurb") or "").strip(),
                    "notes": (raw.get("Notes") or "").strip(),
                }
            )

            seen_urls: set = set()
            contact_lines = (raw.get("Known Contact LinkedIns") or "").splitlines()
            for line in contact_lines:
                parsed = parse_contact_line(line)
                if not parsed:
                    continue
                full_name, title, url = parsed
                # Dedupe within a company by URL
                if url in seen_urls:
                    continue
                seen_urls.add(url)

                contacts_rows.append(
                    {
                        "id": str(uuid.uuid4()),
                        "company_id": company_id,
                        "company_name": company_name,  # for human readability only
                        "full_name": full_name,
                        "title": title or "",
                        "linkedin_url": url,
                        "status": "not_contacted",
                    }
                )

    # Write companies.csv
    companies_path = out_dir / "companies.csv"
    with companies_path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=[
                "id",
                "name",
                "relevance_tier",
                "employees",
                "size_tier_hint",
                "state",
                "website",
                "blurb",
                "notes",
            ],
        )
        writer.writeheader()
        writer.writerows(companies_rows)

    # Write contacts.csv
    contacts_path = out_dir / "contacts.csv"
    with contacts_path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=[
                "id",
                "company_id",
                "company_name",
                "full_name",
                "title",
                "linkedin_url",
                "status",
            ],
        )
        writer.writeheader()
        writer.writerows(contacts_rows)

    return len(companies_rows), len(contacts_rows)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input_csv", type=Path)
    parser.add_argument("--out-dir", type=Path, default=Path.cwd())
    args = parser.parse_args()

    n_companies, n_contacts = process(args.input_csv, args.out_dir)
    print(f"Wrote {n_companies} companies and {n_contacts} contacts to {args.out_dir}")
    print()
    print("Next steps:")
    print("  1. In Supabase Studio, run the CRM migration first (see CRM-HANDOVER-SPEC.md)")
    print("  2. Import companies.csv into public.crm_companies (do NOT map 'size_tier_hint')")
    print("  3. Import contacts.csv into public.crm_contacts (do NOT map 'company_name')")
    print("  4. Verify foreign keys: every contacts.company_id should match a companies.id")


if __name__ == "__main__":
    main()

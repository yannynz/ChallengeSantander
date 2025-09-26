from __future__ import annotations

import os

from etl_base1 import load_base1
from etl_base2 import load_base2


def main() -> None:
    filepath = os.getenv("BASE_FILE", "Challenge FIAP - Bases.xlsx")
    load_base1(filepath)
    load_base2(filepath)


if __name__ == "__main__":
    main()

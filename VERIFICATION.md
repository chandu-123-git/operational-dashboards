# Browser verification — 12 November 2026

The revised dashboard was opened through the managed HTTP preview and tested in Chrome with real UI controls. The following visible results passed.

| Check | Observed result |
| --- | --- |
| Manager reset | 10:00, All warehouses, All status, empty search, Overdue only off, six matches, page 1 of 2, empty alert history |
| Search from page 1 | ORD-104 returned as the sole result |
| Status filter from page 2 | Awaiting dispatch returned to page 1, five matches across two pages |
| Second filtered page | ORD-104 and ORD-106 |
| North overdue queue | ORD-101 and ORD-102, total two |
| All warehouse summary | KPI 3, North 2, South 1 |
| North reconciliation | KPI, North bar, and filtered table total each 2 |
| Table-only search | ORD-101 search reduced table total to 1 while North summary stayed 2 |
| Replay at 10:06 | KPI 4, North 3, South 1, ORD-103 entered overdue queue, one alert timestamped 10:06 |
| Replay at 10:07 | Same counts, same single alert |
| Replay at 10:08 | KPI 3, North 2, South 1, ORD-103 left overdue queue, single historical alert retained, advance disabled |
| Operator reset | North scope fixed, two overdue orders at 10:00, empty history |
| Summary visibility | Summary and its scope explanation hidden in operator view and visible in manager view |
| Operator at 10:06 | Three overdue North orders and one ORD-103 alert |
| Operator search after clearing table filters | ORD-104 returned zero matches at 10:06 |
| Manager South queue at same time | ORD-104 appeared at 10:06 |
| Final manager reset | Restored starting view and cleared alert history |

Section 1's practice sequence matches the browser results above.

Published-version verification remains pending. The GitHub connection now reports write access to chandu-123-git/operational-dashboards. The repository owner must enable GitHub Pages for main and /docs. The source is prepared for that publishing configuration.

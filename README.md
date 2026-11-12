# Order Fulfillment Dashboard
UGSoT Operational Dashboards teaching simulation.

## Student access
Students use the hosted dashboard and the guided lesson in SECTION_1.md. Publication is pending.

## Maintainer setup
Download this project and open docs/index.html in Chrome or Edge. No packages, build command, or server is required.

## Deploy
In the repository owner account, open Settings → Pages. Choose Deploy from a branch, select main and /docs, and click Save. The application is self-contained in docs/index.html. docs/.nojekyll enables plain static publishing. After publication, verify the live application using the checklist below and add its confirmed URL to this README and SECTION_1.md.

## Sample data
The six sample orders are in the orders array in docs/index.html. All times represent the same simulated day. An order is overdue when its promised dispatch time has passed and its status is Awaiting dispatch. At the exact promised time it is due.

## Reset and roles
Select Operations manager or North warehouse operator, then click Reset. Reset returns to 10:00, clears alerts, and restores that role's default filters. Changing roles preserves replay time but restores view defaults. Both roles are simulated views.

## Verification checklist
1. Manager, Reset. Search ORD-104 from page 1. Clear search, go to page 2, choose Awaiting dispatch. Expect page 1, five matches across two pages. Select North and Overdue only. Expect ORD-101 and ORD-102.
2. Manager, Reset, Overdue only. Expect KPI 3, North 2, South 1. Select North: KPI, chart, and table total equal 2. Search ORD-101: table 1, summary 2.
3. Manager, Reset, Overdue only. Advance through 10:06, 10:07, 10:08. Expect KPI 4, 4, 3. One ORD-103 alert appears at 10:06 and remains in history. Reset clears history.
4. Operator, Reset, advance to 10:06. Expect three overdue North orders. Clear table filters and search ORD-104: zero matches. Switch to manager at the same time, select South and Overdue only: ORD-104 appears.

## Business Views design activity
Choose a bar, line, or pie chart to compare overdue orders across warehouses. Explain your choice, then compare with the supplied chart. A bar chart supports direct comparison of counts. A line chart is appropriate when the question concerns change over time.

## Real-Time Operations activity
Predict each replay result before advancing. Explain automatic refresh, how last-refresh time helps assess freshness, and how stale data could cause a wrong operational decision.

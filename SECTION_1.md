# Section 1 — Dashboard Fundamentals

An operations team needs to know which orders require attention. Some questions concern a specific order. Others concern a group, such as all orders awaiting dispatch at one warehouse.

An operational dashboard brings these records together so the team can investigate them. In this activity, you will use an order table to find a record, narrow the results, and move between pages.

## The order fulfillment scenario

The dashboard contains six sample orders across North and South warehouses. Each order has an ID, a promised dispatch time, and a status.

The simulated clock starts at 10:00. An order is overdue when its promised dispatch time has passed and its status is Awaiting dispatch. For example, an order promised at 09:30 and still awaiting dispatch is overdue at 10:00. An order promised at 10:05 is still within its deadline.

## Reading the table

Each row represents one order. The columns show the order ID, warehouse, promised dispatch time, status, and whether the order is overdue.

Use order ID search to locate a known order. Use filters to select records that meet a condition. Multiple filters work together. Selecting North and Overdue only shows overdue North orders.

The table displays three rows per page. The matching-order count describes all records that meet your search and filters. Search and filtering apply before the results are divided into pages. Changing a search or filter returns you to page 1.

## Practice — Find the orders that need attention

Open the supplied dashboard. Select Operations manager under Simulated demo view, then click Reset.

Confirm that the simulated last refresh is 10:00, Warehouse is All warehouses, Status is All, search is empty, and Overdue only is off. The table should show six matching orders across two pages. Page 1 contains ORD-101, ORD-102, and ORD-103.

### Find a known order

1. Stay on page 1.
2. Enter ORD-104 in the field with the placeholder Enter an order ID.

The table shows ORD-104 as its only match. Search found the order across the full dataset even though it originally appeared on page 2.

### Filter orders awaiting dispatch

1. Clear the search text.
2. Keep All warehouses selected and Overdue only off.
3. Click Next page.
4. Confirm that page 2 contains ORD-104, ORD-105, and ORD-106.
5. Select Awaiting dispatch in Status.

The table returns to page 1. It shows five matching orders across two pages. Page 1 contains ORD-101, ORD-102, and ORD-103. Click Next page to see ORD-104 and ORD-106. ORD-105 has shipped, so it falls outside this filter.

### Find overdue North orders

1. Select North under Warehouse.
2. Keep Awaiting dispatch selected.
3. Turn on Overdue only.

The table shows ORD-101 and ORD-102, with two matching orders on one page. ORD-103 belongs to North but its 10:05 deadline has not passed at the simulated time of 10:00.

## Check your understanding

Explain why search found ORD-104 from page 1, why selecting Awaiting dispatch returned the table to page 1, and why ORD-103 is absent from the final queue.

Then describe the final result in one sentence, including the warehouse, status, and time. A suitable answer is “At 10:00, two North warehouse orders are awaiting dispatch beyond their promised dispatch times.”

## Next — Business Views

You can now inspect the individual orders that need attention. In Business Views, you will use a KPI and a chart to compare overdue counts across warehouses, choose a suitable chart for that question, and check the summary against the underlying table.

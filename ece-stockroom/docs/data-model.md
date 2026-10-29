# Data model

These are the records the app reads and writes. In the prototype they all live in one object in `localStorage` (see `js/store.js`). A production version would store each one as a table or collection behind an API, with the same fields.

## People and teams

**Account**

| Field    | Notes                                  |
| -------- | -------------------------------------- |
| `u`      | eRaider username, unique               |
| `name`   | Display name                           |
| `role`   | `student` or `admin` (stockroom staff) |
| `team`   | Team ID, students only                 |
| `avatar` | Profile photo                          |

**Instructor**: `id`, `name`, `course`, `section`.

**Team**: `id`, `name`, `project`, `instructor`, `budget` (the course allocation in dollars), `members` (account names).

## Catalog

**Category**: `id`, `name`, `blurb` (one line shown under the category in Stock).

**Item**

| Field    | Notes                                                     |
| -------- | --------------------------------------------------------- |
| `sku`    | Unique and permanent once orders reference it             |
| `name`   |                                                           |
| `cat`    | Category ID                                               |
| `mode`   | `buy`, `rent` or `both`                                   |
| `price`  | Purchase price                                            |
| `rent`   | Rental fee, `0` for free                                  |
| `limit`  | `null`, or `{ n, per }` where `per` is `term` or `course` |
| `desc`   | Description                                               |
| `specs`  | List of `[label, value]` pairs                            |
| `photo`  | Uploaded photo, if any                                    |
| `hidden` | Hidden items stay in order history but not in Stock       |

**Stock** is kept separately as `sku → quantity on the shelf`. Checking out a request takes the quantity off the shelf right away. Cancelling a request or checking a rental back in puts it back.

## Orders

**Order**

| Field    | Notes                                                    |
| -------- | -------------------------------------------------------- |
| `id`     | `SR-####`                                                |
| `team`   | Team ID                                                  |
| `by`     | Name of the student who placed it                        |
| `status` | `requested`, `purchased` or `cancelled`                  |
| `at`     | When it was placed                                       |
| `doneAt` | When staff marked it purchased or cancelled              |
| `note`   | Optional note for the desk                               |
| `items`  | Lines of `[sku, quantity, unit price, mode, returnedAt]` |

The unit price is copied onto the order at checkout, so later price changes don't change past orders. `returnedAt` is only used for rental lines.

## Lab access

**Certificate**: `student`, `team`, `status` (`none`, `pending`, `verified` or `rejected`), `file`, `at`, `note` (the reason when rejected). A verified certificate grants lab access.

## 3D printing

**Print job**: `id`, `team`, `desc`, `status` (`queued`, `printing`, `ready` or `collected`), and a timestamp for each step: `at`, `startedAt`, `readyAt`, `collectedAt`.

**Print charge**: `id`, `team`, `desc`, `amount`, `at`, `job` (the print job it belongs to). Staff enter the amount when they mark a job ready. A job can be marked ready with no charge.

## Budget math

For each team:

- **Spent** = the total of its purchased orders + its print charges
- **On hold** = the total of its requested orders
- **Available** = course allocation − spent − on hold

A student can't check out a cart that costs more than the team's available balance. Purchase limits count every requested and purchased unit of that SKU for the team. Rentals don't count toward limits.

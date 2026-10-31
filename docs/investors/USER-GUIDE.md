# Investor portal: user guide

How the portal at `automatos.app/investors` works, screen by screen. The first part is for investors, the second for admins. Words in quotation marks are the exact labels the portal shows; they all live in `investors/src/strings.ts`.

- [For investors](#for-investors)
  - [Finding the portal](#finding-the-portal)
  - [The signed-out page](#the-signed-out-page)
  - [Creating an account and signing in](#creating-an-account-and-signing-in)
  - [The first-visit profile](#the-first-visit-profile)
  - [Home](#home)
  - [The Documents page](#the-documents-page)
  - [Opening and downloading documents](#opening-and-downloading-documents)
  - [The PDF viewer](#the-pdf-viewer)
  - [Present mode](#present-mode)
  - [Video](#video)
  - [Team, Story, FAQ and Contact](#team-story-faq-and-contact)
  - [Editing your profile and signing out](#editing-your-profile-and-signing-out)
  - [What the portal records](#what-the-portal-records)
  - [Emails](#emails)
  - [Messages you may see](#messages-you-may-see)
  - [Your data](#your-data)
- [For admins](#for-admins)
  - [Who is an admin](#who-is-an-admin)
  - [The admin area](#the-admin-area)
  - [Overview](#overview)
  - [Documents](#documents)
  - [Document stats](#document-stats)
  - [Investors](#investors)
  - [Sections](#sections)
  - [Alert emails](#alert-emails)
  - [Retention](#retention)
  - [Light and dark: bone and pitch](#light-and-dark-bone-and-pitch)

---

## For investors

### Finding the portal

The portal is at `automatos.app/investors`. Every page of the site links to it: "Investors" in the header and the phone menu (`_nav.js`) and in the footer's Company column (`_footer.js`).

### The signed-out page

Before you sign in, `/investors` shows a fixed page (`investors/src/pages/Teaser.tsx`). It reads nothing from the portal's API, so it is the same for every visitor and never shows text an admin has written. From top to bottom:

1. **"Investor portal"**, the page title.
2. **The company card**: a cover picture, the Automatos mark and name, and a one-line description of the company.
3. **Access**: two buttons, "Create an account to read the deck" and "Sign in". Each opens the sign-in service's form in a window over the page. While that service loads, the buttons are greyed out. If it fails to load, the buttons are replaced by "Sign-in is unavailable right now. Email hello@automatos.app." If the portal has no sign-in key configured, they are replaced by "The investor portal is temporarily unavailable."
4. **The tracking notice**, directly under the buttons (quoted in [What the portal records](#what-the-portal-records)).
5. **"Inside the portal"**: six cards with a lock, labelled Pitch deck, One-pager, Product demo, Business model, Team and FAQ, each with "Sign in to open". Clicking a card opens the sign-in form. These six labels are fixed in the code; they do not change with what is published.
6. **The founder card**: the founder's photo, name and role, a one-line quote, and the work email. A LinkedIn row and a "Book a call" button appear only once their addresses are set in `investors/src/company/company-data.ts`; at this commit both are unset, so neither shows.
7. **The team**: names and roles, from the same file.
8. **Product links**: two groups, "See it working" and "Also from Automatos". Each card names a product, its address, a short line and, where the code gives one, a status chip such as "LIVE" or "IN BETA".

### Creating an account and signing in

Sign-in is run by Clerk, using the site's production Clerk instance. "Create an account to read the deck" opens Clerk's sign-up form; "Sign in" opens its sign-in form. Which sign-in methods those forms offer is set in the Clerk instance, not in this repository. The portal accepts any of them, with one condition: **the account must have a verified email address**. The portal uses the account's primary email if it is verified, otherwise the first verified one. An account with no verified email sees "A verified email is needed".

After signing in or up you come back to the portal page you were on. Signing out takes you to `/investors`.

There is no invite list or approval step in the portal's code: anyone with a verified email can create an account and read what is published. Admins can block an account at any time (see [Block and unblock](#block-and-unblock)).

### The first-visit profile

The first time you sign in, every portal page takes you to the profile form, "About you" (`investors/src/pages/Profile.tsx`). The menu stays hidden until you save it. Your name is filled in from your sign-in account if it has one.

| Field | Required | Rules |
|---|---|---|
| Name | yes | one line, up to 120 characters |
| Firm ("Firm or Independent") | yes | one line, up to 160 characters |
| Title | no | up to 120 characters |
| Investor type | yes | Venture capital, Angel, Family office, Corporate, Accelerator or Other |
| Typical cheque size | no | Under 50k, 50k to 250k, 250k to 1M, Over 1M; blank means "Prefer not to say" |
| LinkedIn | no | an `https://` address on `linkedin.com` or one of its subdomains, up to 300 characters |
| Country | no | up to 80 characters |
| Where did you hear about us? | yes | Web Summit, An introduction, The Automatos website, or Somewhere else |
| "Send me Automatos investor updates (optional)" | no | a tick box, unticked by default |

The form checks each field as the server will, so most mistakes show before anything is sent. "Save and continue" saves the profile and takes you to Home. The tracking notice is repeated under the form. You can save at most 10 times a minute; past that you see "Too many saves in a row. Wait a minute and try again."

### Home

Home (`/investors`, `investors/src/pages/Home.tsx`) shows, from top to bottom:

1. **"Investor portal"** and a one-line intro.
2. **The company and founder header**: the company card in a shorter form, with the founder card beside it (photo, name, role and contact rows) and the team along its foot. The contact rows are the work email, then any rows the admins have published in the founder card section (signed-in investors only), then LinkedIn once its address is set.
3. **"Quick access"**: a tile for each thing the portal holds, shown only when it exists, in this order:
   - "View the deck", which opens the pitch deck in [present mode](#present-mode);
   - "Play the demo", which opens the pitch video's page;
   - "Documents", which opens the Documents page;
   - "Team" and "FAQ", once those pages are published;
   - "Book a call", which opens the booking page in a new tab once its address is set in the code, or goes to the Contact page while that is unset and Contact is published.
4. **Product links**, as on the signed-out page.
5. **The overview**: the admins' text for Home, once it is published and not empty.
6. **"The pitch"**: when the library has documents in a category that starts with "Pitch" (any case), the first PDF among them is shown as the deck, with "View the deck" and "Download PDF", and the first video as a poster with "Play" and "Download video". Nothing is fetched for the video until you press Play.
7. **The library**: every other published document, grouped by category, in the order the admins set.

If no document is published yet, the library says "Documents are on their way." with the hello@automatos.app address. If document storage is down, Home still shows, with "Documents are unavailable right now. Please try again later." where the documents would be, and the deck, demo and Documents tiles are hidden.

### The Documents page

"Documents" in the menu (`/investors/documents`) lists the same published documents with a search box. The search matches the title, description and category; a document must contain every word you type. Each card shows the kind (PDF, Video, Spreadsheet, Slides, Document or Other), the title and description, the size and the date it was last updated, with "Open" and "Download".

### Opening and downloading documents

- **Open** on a PDF goes to the PDF viewer; on a video, to the video's page. Any other kind (spreadsheet, slides, Word document, other) cannot be shown in the browser, so Open downloads it.
- **Download** saves the file under its original name.

Files are never public. Each time you open or download one, the portal asks the server for a private link that works for 5 minutes. If a document was withdrawn since the list loaded, you see "This document is no longer available. The list has been refreshed." You can ask for at most 30 links a minute.

### The PDF viewer

The viewer (`/investors/documents/<id>`, `investors/src/viewer/PdfViewer.tsx`) shows one page at a time, fitted to the width of the screen, with "Previous page", "Next page", "Page N of M", "Present" and "Download". The left and right arrow keys turn the page.

The private link expires after 5 minutes. If it expires while the PDF is still loading, the viewer asks for a new one once, by itself. If that also fails, it shows "This document could not be shown here" with "Download" and "Try again". The whole file is fetched in one go, so once a PDF has loaded it stays readable for as long as the page is open.

### Present mode

Present mode shows the PDF as a full-screen slideshow (`investors/src/viewer/use-present-mode.ts`). You start it with "Present" in the viewer, or with "View the deck" on Home, which opens the viewer already presenting.

- The slideshow asks the browser for full screen. If the browser refuses, or cannot (an iPhone's Safari cannot), the slideshow fills the window instead. On browsers that support full screen, a "Full screen" button in the slideshow's bar then asks again.
- **Keys**: Right arrow, Page Down, Space or Enter for the next slide; Left arrow, Page Up or Backspace for the previous one; Home for the first; End for the last; Esc to leave.
- **Touch**: swipe left or right (at least 50 pixels) to change slide, or tap the right or left third of the slide.
- The bar with "Slide N of M", the arrows, "Download", "Full screen" and "Exit" hides after 3 seconds without input and comes back on any touch, mouse movement or key. It stays while the mouse rests on it or keyboard focus is on one of its buttons.
- Leaving present mode, by "Exit", Esc or the browser's own full-screen exit, returns you to the normal viewer.

### Video

A video's page uses the browser's own player, with its controls, playing inline on a phone. Only the video's details are fetched until you press play. If the private link expires while you watch, the player asks for a new one and picks up at the same point. If that fails, you see the error with "Download" and "Try again".

### Team, Story, FAQ and Contact

These four pages hold text the admins write. Each appears in the menu only once an admin has published it, always in the order Team, Story, FAQ, Contact. A published page with no text yet says "Coming soon.". Links in the text that leave the site open in a new tab.

### Editing your profile and signing out

"Account" at the top right shows your email address, "Profile" and "Sign out". "Profile", also in the menu, opens the same form as on your first visit, titled "Your profile". Changes save with "Save".

Once your profile is saved, the menu shows Home, Documents, the published section pages, Profile and, for admins only, Admin. On a phone the menu opens from the button at the top left.

The portal follows the site's light ("Bone") or dark ("Pitch") look. See [Light and dark: bone and pitch](#light-and-dark-bone-and-pitch).

### What the portal records

The tracking notice, shown under the sign-in buttons and under the profile form, says exactly:

> When you sign in, we record which documents you open or download and how long you spend on each page, so the team can follow up with the right information. See our Privacy Policy. Ask privacy@automatos.app to see or delete your data.

"Privacy Policy" links to `/privacy#investors`, section 07 of the privacy policy, which also lists video progress and your visits.

In detail, from the code (`server/investors/auth.js`, `server/investors/routes/`, `investors/src/tracking/`):

**What the server records**

- **Your account**: your sign-in account's ID, its verified email address and its name, the first time you sign in.
- **Your profile**: the answers you save, and when you last turned on the investor-updates box (unticking it keeps that time).
- **When you were last seen**: updated at most once a minute while you use the portal.
- **Sign-ins**: one the first time you sign in, and one each time you come back after more than 30 minutes away.
- **Profile completed**: once, on your first save.
- **Opens and downloads**: each time the portal asks for a link to show you a document (opening a PDF or video, starting the deck from Home, pressing Play on Home's video, or renewing an expired link) it records an open; each download records a download. Both note which version of the document it was.

**What your browser sends while you are signed in**

- **Time on PDF pages**: a page counts once at least half of it is on screen, in a visible tab, for at least one second. The page number, the document version and the time are recorded, at most 10 minutes per entry. Present mode counts the same way.
- **Time on the Team, Story, FAQ and Contact pages**: the time the page is open in a visible tab, in stretches of at least one second, at most 10 minutes per entry.
- **Video progress**: the first time you pass 25%, 50%, 75% and 100% of a video, once each per viewing.
- **Visits**: a visit starts when the portal loads in a tab. While the tab is visible it tells the server the visit is still going every 30 seconds. The visit stores your browser's user-agent text, up to 300 characters.

These are queued in the browser and sent every 10 seconds, and straight away when you switch tab or close the page.

**What is not recorded**: IP addresses (no table has a column for one), clicks on the Quick access tiles, and time spent on Home or the Documents page.

### Emails

The portal sends no email to investors. The only emails it sends are alerts to the team (see [Alert emails](#alert-emails)). Ticking "Send me Automatos investor updates" records your choice and when you made it; the portal does not send those updates itself. While you create an account, the sign-in service may email you a verification code, depending on how it is set up.

### Messages you may see

| Message | What it means |
|---|---|
| "Access paused" | An admin has blocked your account. The message gives privacy@automatos.app to contact. |
| "Please sign in again" | Your session ended. "Sign in" opens the sign-in form. |
| "A verified email is needed" | Your sign-in account has no verified email address. |
| "Not available" | That page is not open to your account (for example, the admin area). |
| "Temporarily unavailable" | The portal's server side is not running or is starting up. |
| "Documents are unavailable right now. Please try again later." | Document storage cannot be reached. The rest of the portal works. |
| "Too many requests in a row. Wait a minute and try again." | More than 30 document links in a minute. |
| "This document could not be shown here" | The viewer could not load the file. Download it or try again. |
| "Something went wrong" | Anything else. "Try again" retries. |

### Your data

The portal keeps what it records about you for 6 months after your last visit, then deletes it automatically (`server/investors/retention.js`; the privacy policy says the same). If your access has been paused, it keeps only what is needed to keep it paused: your sign-in account's ID and the block. To get a copy of what it holds, or to have it deleted sooner, email privacy@automatos.app.

---

## For admins

### Who is an admin

An admin is a signed-in user whose Clerk user ID is in the server's allowlist, the environment variable `INVESTOR_ADMIN_CLERK_IDS` (a comma-separated list of Clerk user IDs; empty means no admins). The server reads it when it starts, so a change takes effect on the next restart or deploy. You can read a person's Clerk user ID on their page under Admin, Investors ("Clerk user"), or in the Clerk dashboard.

The server checks the allowlist on every admin request, whatever the app shows. An admin is also an investor: they complete the same profile before they can use the portal, they appear in the investors list, and their own opens and reading are recorded like anyone else's.

### The admin area

Admins see "Admin" in the menu (`/investors/admin`). Its own links along the top are Overview, Documents, Investors and Sections. Anyone else who opens an admin address sees "Not available".

### Overview

The overview (`/investors/admin`) shows, on one screen:

- **Four numbers** (the last 7 days, rolling):
  - "Investors": everyone with an account, and how many are new in the last 7 days;
  - "Active investors": investors with any recorded activity;
  - "Deck opens": opens of documents whose "email the team" switch is on;
  - "Downloads": every download.
- **"Sign-ups and active investors"**: a chart per day over the last 30 days (days in UTC).
- **"Latest activity"**: the 20 newest events from anyone, such as "Opened <title>" or "Read page 3 of <title>". Each links to the investor's page. An event on a deleted document reads "a deleted document".

### Documents

"Documents" (`/investors/admin/documents`) lists every document, published or not, in the order investors see them. The columns are Title (with the file name and page count underneath), Category, Kind, Version, Size, Published, Alert, Updated and Actions.

If document storage is not configured, the page says "File storage is not set up yet, so documents cannot be managed."

#### Create

"New document" opens a form:

| Field | Rules |
|---|---|
| Title | required, one line, up to 160 characters |
| Description | optional, up to 600 characters |
| Category | required, up to 60 characters; the categories already in use are suggested |
| Kind | required: PDF, Video, Spreadsheet, Slides, Document or Other |
| "Email the team when an investor first opens it" | a switch, off by default |

A new document starts unpublished, without a file, at the end of the list. Investors see nothing until it has a file and is published.

Choose the kind to match the file. The investor app decides how to show a document from its kind: a PDF opens in the viewer, a Video in the player, and every other kind downloads.

#### Upload

"Upload" in the row opens a file picker. The rules (`investors/src/admin/file-types.ts`, `server/investors/s3.js`):

- **File types**: PDF, MP4, CSV, XLSX, PPTX or DOCX.
- **Size**: up to 250 MB (262,144,000 bytes); an empty file is refused.
- **PDF pages**: the browser counts a PDF's pages before uploading. A PDF it cannot read, or one with more than 2000 pages, is refused.

The row then shows "Preparing the upload…", a progress bar with "Uploading… N%", then "Checking the file…" while the server checks the stored file again, then "Uploaded as version N." "Cancel" stops an upload in progress. The upload link the server hands out is valid for 15 minutes; if it runs out you see "The upload link expired. Upload the file again." The file goes straight from your browser to the private bucket; it does not pass through the site's server.

#### Replace and versions

Once a document has a file, the button reads "Replace". A replacement goes through the same steps and becomes the next version (v2, v3 and so on). The previous file is then deleted from storage (if that fails, the old file stays in the bucket and the server logs it). The document keeps its published state, so investors get the new file at once. Reading history stays attached to the version it was recorded against, and [Document stats](#document-stats) can show each version. If two uploads to the same document race, the second to finish is refused with "Another upload of this document finished first."

#### Publish and unpublish

The Published switch shows or hides the document for investors at once. It cannot be turned on until the document has a file ("Upload a file before publishing."). A link an investor already holds keeps working until it expires, at most 5 minutes later.

#### Reorder

"Move up" and "Move down" change the document's place. Investors see documents in this order, and categories in the order their first document appears.

#### Preview

"Preview" opens the document's current file in a new tab, published or not. Previews are not recorded as investor activity. If the browser blocks the new tab, allow pop-ups for the page and try again.

#### Edit

"Edit" opens the same form as Create. Changes show to investors at once.

#### Delete

"Delete" asks first: "“<title>” and its file are deleted. Investors can no longer open it; their reading history is kept. This cannot be undone." The history stays in the investors' timelines, shown against "a deleted document". If storage refuses to delete the file, nothing is deleted and you can try again.

#### The pitch block on Home

Investors' Home puts a deck and a video at the top under "The pitch". The deck is the first PDF, and the video the first video, among published documents whose category starts with "Pitch" (any case), in the list's order. Every other document, including other Pitch ones, stays in its category below. The page says: "Category 'Pitch' puts a PDF and a video at the top of the investor home page."

#### The Alert switch

The Alert switch is the same "Email the team when an investor first opens it" setting. It also decides what counts as the deck: the overview's "Deck opens" and the investors list's "Deck" column read documents with this switch on.

### Document stats

"Stats" in a document's row (`/investors/admin/documents/<id>/stats`) shows how one version of the document was read. A version picker lists the current version and every version with recorded activity, newest first; the current version is the default.

- **Numbers**: "Readers" (everyone who opened, read or downloaded this version), "Opens" (every open counts), "Downloads" (every download counts) and "Average time" (time on its pages, per reader).
- **Charts**, for PDFs: "Time per page", the average time on each page over the readers who viewed it; and "Readers reaching each page", the share of this version's readers who got to each page or further. A document that is not a PDF, or a PDF without a known page count, has no page charts.
- **Readers**: one row per reader with furthest page, time, whether they downloaded it, and when they last opened it, newest open first. A reader who only downloaded shows a dash for "Last opened".
- An older version is charted over the current file's page count, and the page says so.

The page lists these counting rules under "How it is counted".

### Investors

#### The list

"Investors" (`/investors/admin/investors`) lists everyone who has signed in, 50 to a page.

- **Search** by name, email or firm.
- **Filter** by investor type and by source ("Where did you hear about us?"). "Clear search and filters" resets both.
- **Sort** by clicking a column heading: Investor, Firm, Signed up, Last seen, Sessions, Time, Opened or Downloads. The default is Last seen, newest first. Empty values sort last either way.
- The columns are Investor, Firm, Type, Cheque, Source, Signed up, Last seen, Sessions, Time, Opened, Downloads, Deck and Access.
  - "Time" is time on document pages and section pages.
  - "Opened" counts documents opened at least once.
  - "Deck" is the furthest page read, over every version, of the alert-flagged document this investor opened most.
- The search, filters, sort and page are kept in the address, so a view can be bookmarked or shared with another admin.
- "Block" or "Unblock" in the Access column; see [Block and unblock](#block-and-unblock).

#### CSV export

"Export CSV" downloads every investor in the current view, all pages, with its search, filters and sort, as `investors-YYYY-MM-DD.csv`. The columns are Name, Email, Firm, Investor type, Cheque size, Source, Signed up (UTC), Last seen (UTC), Sessions, Total time (min), Documents opened, Downloads, Deck furthest page, Deck page count, Blocked and Marketing opt-in. The file starts with a UTF-8 byte-order mark so Excel reads accented names correctly, and a cell that a spreadsheet would run as a formula is stored as text. The server log records which admin exported how many rows, never the contents.

#### One investor

Clicking an investor opens their page (`/investors/admin/investors/<id>`):

- **Profile**: email, firm, title, investor type, typical cheque size, LinkedIn, country, where they heard about you, whether they want investor updates (and since when), signed up, last seen, when they completed the profile, and their Clerk user ID.
- **Documents**: each existing document they have any recorded activity on (opened, read, watched or downloaded), with opens, furthest page, time and whether they downloaded it, counted over every version.
- **Timeline**: every recorded event, newest first, 50 to a page, each with its details (time, document, version, page, duration, session, data).
- **Block** or **Unblock**, **"Export data (JSON)"** and **"Delete investor"** at the top.

#### Block and unblock

Blocking pauses an account. On their next request the investor sees "Access paused" and can do nothing else in the portal until unblocked. Their profile and history are kept. You cannot block your own account. The server log records who blocked or unblocked whom.

#### Export data

"Export data (JSON)" downloads `investor-<id>.json`: the profile, every visit and every event, oldest first. Use it to answer a request to see one's data.

#### Delete

"Delete investor" asks you to type the investor's email address to confirm. It deletes their profile, visits, events and alert records from the portal. Their Clerk account is not touched: if they sign in again, they start over with a new, empty profile. The server log records who deleted whom.

### Sections

"Sections" (`/investors/admin/sections`) lists the six texts admins write, where each shows, whether it is published, and when it was last saved. There is no way to add or remove a section from the admin area; each one is created by a database migration.

| Section | Where investors see it |
|---|---|
| Overview | Home, above the documents, without its title |
| Team | The Team page |
| FAQ | The FAQ page |
| Contact | The Contact page |
| Founder card | Home, in the founder card, signed-in investors only |
| Story | The Story page (`/investors/story`) |

#### Edit, preview, save and publish

"Edit" opens the section's editor, with the form on one side and a live preview on the other (stacked on a phone).

- **Title**: required, one line, up to 80 characters. Team, Story, FAQ and Contact show it as the page title.
- **Published**: investors see the section only while this is on. A Team, Story, FAQ or Contact page appears in their menu once it is published; the overview and the founder card rows show only when published and not empty.
- **Text**: Markdown, up to 20,000 characters, with a character count. Tabs and line breaks are fine; other control characters are refused.
- **Preview**: the draft as investors will see it once saved and published, updated as you type, through the same renderer the investor pages use.
- **Save** sends the title, the published switch and the text together, and is enabled only when something has changed. A message confirms the save and says whether investors now see it. The server records which admin saved it last.
- **Unsaved changes**: following a link away from the editor asks "Leave without saving?" first, and closing or reloading the tab triggers the browser's own warning.

#### What Markdown does here

The hint under the text box sums it up: "Markdown: # for a heading, - for a list item, [words](https://…) for a link. HTML is not shown." In detail (`investors/src/sections/Markdown.tsx`):

- Headings, paragraphs, lists, bold, italics, quotes, code and horizontal rules work. A `#` heading shows one level below the page title.
- Raw HTML is dropped, never shown.
- Links with an unsafe scheme (`javascript:` and similar) become plain text. Links to other sites open in a new tab; links within the site, and `mailto:` links, open in place.
- Images show only from the site's own address; an image from elsewhere is left out.

#### Founder card rows

The founder card section is not free text. It holds the contact rows that signed-in investors see on Home's founder card, after the work email. One row per line:

```
- [shown text](address) label
```

For example `- [+00 0000 000000](tel:+0000000000) Mobile`.

- The address must start with `https:`, `mailto:` or `tel:`; a `tel:` address may hold only digits, `+` and spaces.
- Up to 6 rows. The shown text may have up to 60 characters, the label up to 30.
- A line that does not fit these rules, and any line after the sixth row, is left off the card. The preview shows the card as it will look and says how many lines it left out.
- Nothing from this section ever appears on the signed-out page, which is why contact details such as a phone number belong here and not in the code.

### Alert emails

The portal can email the team about two things (`server/investors/alerts.js`):

- **A new investor**: sent when an investor saves the profile for the first time, not when the account is created. Subject: "New investor: <name> (<firm>)". It lists the name, email, firm, type, cheque size and source.
- **A first open**: sent when an investor opens a document whose "Email the team when an investor first opens it" switch is on, and they have never opened that document before. Downloads do not count. Turning the switch on later sends nothing for people who had already opened the document. Subject: "<name> (<firm>) opened <title>". It lists the name, email, firm and document.

Each email links to the investor's admin page.

**Who gets them**: the addresses in the environment variable `INVESTOR_ALERT_EMAILS` (comma-separated). They are sent through the contact form's mail settings (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`), from the `SMTP_USER` address with the name "Automatos Investor Portal". With no recipients, or without `SMTP_USER` and `SMTP_PASS`, no alerts are sent and the server logs one warning when it starts.

**Sent once**: each alert is recorded before it is sent, so it goes out at most once per investor (new investor) or once per investor and document (first open). A send that fails is logged and not retried.

### Retention

Once a day, the server deletes every investor not seen for 6 months, with their visits, events and alert records (`server/investors/retention.js`). For a blocked investor it deletes the history and every profile detail but keeps a minimal record, the Clerk user ID and the block, so the person cannot come back as a new investor. The privacy policy's section 07 states the same rule; change both together.

### Light and dark: bone and pitch

The portal has the site's two looks: "Bone" (light) and "Pitch" (dark). The switch sits under the links in the sidebar and at the bottom of the phone menu, so it shows once the profile is saved. The choice is stored in the browser under the same key the main site uses (`investors/src/theme/mood.ts`), so it carries over to automatos.app's pages and other open tabs. Without a saved choice, the portal follows the device's dark-mode setting. The sign-in form takes the look in force when the page loaded.

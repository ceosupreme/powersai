# Automation Inbox and Approvals
<!-- part: Clients and leads | order: 72 | slug: automation-inbox | route: /automations/inbox | tags: automation inbox, approval gate, approve, reject, send now, retry, suppress recipient, follow-up, reactivation, review request, client approves, client approver, approvals, email delivery, log only -->

Every customer message the system drafts for a client, such as follow-ups to new leads or win-back emails, waits in the Automation Inbox until someone approves it. This is the approval gate: nothing reaches a real customer without an approval, either yours or the client's. Check it daily for any client with automations turned on.

## Where to find it

- On a computer, open "Clients & Leads" in the side menu and choose "Automation Inbox". On a phone, tap "More", then "Automation Inbox".
- A client's project page also has an "Automation Inbox" shortcut card.
- The list follows the project chosen in the header. With "All projects" it shows every project's messages.

## What you see

- Count badges: "Pending", "Approved", "Delivered", "Provider accepted" and "Logged".
- Filters: a "Flagged" button, an automation menu ("All automations", "Follow-up", "Reactivation", "Review request") and a status menu ("All statuses", "Pending review", "Approved", "Accepted / delivered / logged", "Failed", "Rejected", "Canceled"). The "Accepted / delivered / logged" choice adds a third menu to narrow it further.
- A card per message: the automation, the channel, "CLIENT QUEUE" when the client approves this automation, "Flagged" when someone asked for a review, the recipient's name and address, "Send immediately" or "Sends" with a date, the delivery status, a "Subject:" line for emails and an editable message box.
- Buttons by status: "Reject" and "Approve" for pending messages, "Send now" for approved ones, and "Suppress recipient" and "Retry" for failed ones.

## How to use it

### Approve or reject drafts
1. Pick the client in the header.
2. Leave the status menu on "Pending review".
3. Read each message and edit the text in the box if needed.
4. Tap "Approve" (your edits are saved with the approval) or "Reject". Approved messages go out at their scheduled time; the system checks for due messages about every five minutes.

### Send an approved message now
1. Set the status menu to "Approved".
2. Tap "Send now". The button is greyed out while the message is scheduled for later.

### Fix a failed message
1. Set the status menu to "Failed" and read the "Failed:" line, for example a missing business name or address on the project.
2. Fix the cause, then tap "Retry". "Retry" stays greyed out when delivery is unconfirmed or bounced, so check what happened first.
3. Tap "Suppress recipient" to block all future emails to that address for this project.

### Let the client approve instead
1. Open the client's project page, tap "Setup wizard", open "Full configuration", then "Fulfillment automations".
2. Tap "Invite client approver", enter the client's email and send the invite.
3. For each automation, set "Approval mode" to "Client approves" and tap "Save".
4. The client signs in to a simple approvals screen (path /approvals) headed "Waiting on you". They can "Approve", "Edit", "Skip" or "Flag" each message, they see only their own project, and customer contact details are partly hidden.
5. Their choices show here as "Approved by client" or "Skipped by client". Tap "Flagged" to list the messages they asked you to check.

### Turn on real email sending for a client
1. On the client's project page, find the "Email delivery" card.
2. Tap "Live via Resend" and confirm "Turn on live delivery". Tap "Log only (safe mode)" to switch back.

## Words on this screen

- Approval gate: the rule that no drafted customer message goes out until someone approves it.
- pending_review: waiting for approval.
- queued (approved): approved and waiting for its send time.
- logged (not delivered): recorded only; nothing reached the customer.
- provider accepted · delivery unconfirmed: the email service took the message but has not confirmed delivery.
- delivered, bounced: confirmed delivered, or returned as undeliverable.
- unconfirmed — verify before retry: a send stalled and the outcome is unknown.
- CLIENT QUEUE: the client approves this automation.
- Suppress recipient: adds the address to the project's do-not-email list.

## Good to know

- Automations start in log-only mode. Approved emails show "logged (not delivered)" and reach no one until the project's "Email delivery" is switched to live. Text messages are always log-only for now.
- The count badges only count messages that match the current filters, so with the default "Pending review" filter the other counts read zero.
- With "All projects" selected, cards do not say which client they belong to. Pick a client first.
- Edits are only saved when you tap "Approve".
- Follow-up drafts come from leads that arrive through a client's capture link while that client's "Follow-up sequences" automation is on. All touches are drafted at once, each with its own send date, and waiting ones are canceled when the lead replies, books or opts out.
- Not confirmed: nothing on the screens starts "Review request" drafts.
- The list refreshes every 30 seconds and shows up to 500 messages.
- The /approvals screen is built for client logins. You set it up as above; you do not need to use it yourself.

# Agent Desk urgent lane ("Now" and "Queue")

## In one line
Every job is **Queue** unless whoever posts it says **Now**. A Now job wakes its agent right away. If nobody picks it up, the backup agent is woken, then you see it in Waiting on me.

## What you will see on the Agent Desk
- A new **Now** strip at the top, above "Needs you": each urgent job with the agent's name, the brand, and "waiting 12 min" counting up. It turns amber after the first wait, red when it reaches you.
- Every job card and the job sheet get a small **Now / Queue** switch. One tap flips it. Flipping to Now wakes the agent straight away; flipping to Queue stops any more wake-ups.
- On each job: "Woke Claude 9:02 · woke ChatGPT 9:17 · sent to you 9:32", so you can see what HQ already tried.
- Agent cards show "1 urgent" next to the open count.
- An urgent job that waited too long also shows in **Waiting on me** on the Dashboard, with "Hand to another agent" and "Move to Queue".

## The timing (my suggestion; you can change it)
- Posted as Now → main agent woken at once.
- Not picked up in **15 minutes** → backup agent woken (the job's fallback agent).
- Still not picked up **15 minutes later** → in Waiting on me, and an email to ceosupreme@gmail.com.
- No backup set → goes straight to you after 15 minutes.
- "Picked up" means the agent marked it claimed or working. Done, cancelled or moved to Queue stops the clock.

## How each agent gets woken
HQ can always do its part alone: notice a Now job the moment it is saved, decide who to wake, send the wake-up, retry, and escalate to you. Whether the agent then acts depends on what is listening on its side.

HQ will send every wake-up the same way: a short message to an address that agent gives us ("You have an urgent job: <title>. Open job <id>"). The message never carries the job's details, only the pointer, so the agent still reads the board as it does today.

- **Claude.** Claude has no inbox HQ can push into a chat thread. Two options, best first:
  1. A Claude scheduled task that checks only for urgent jobs every 5 minutes (a tiny read, cheap). This is a timer, but short enough to feel immediate.
  2. If you run Claude through something that accepts a web address (a webhook into an automation tool that starts a Claude run), HQ calls that address instantly.
- **Muse and ChatGPT.** Same choice. If their setup can receive a web address call or a message (email, Slack), HQ sends it instantly. If they can only log in and look, they need a short urgent-only check every 5–10 minutes.
- **Any agent on a timer only.** HQ cannot reach it; the timer is the wake-up. So the backup step and the alert to you are what make sure it isn't missed. I'd set each timer agent's 15-minute wait to start after its next check, so it isn't escalated before it had a chance.

**What each agent needs on its side:** (a) a place to receive the ping, or a 5-minute urgent-only check, and (b) one new rule in its instructions: "Rows with urgency 'now' addressed to me come first; claim before working." You said you write the agents' instructions yourselves; I'll give you the exact lines to paste.

Per agent you set, in HQ: wake-up method (web address, email, or timer only) and the address. Kept in a small settings list on the Desk's admin side; web addresses and any keys stay in backend secrets.

## What happens to jobs already on the board
- All 26 open jobs and every old job become **Queue**. Nothing wakes up when this goes live.
- You can flip any of them to Now afterwards.
- Standing jobs (repeating ones) stay Queue and can't be set to Now; a single run you need today should be posted as its own job.

## Setting the level when posting
- In HQ (Create pipeline, Content Studio, owner actions): a Now/Queue choice, Queue pre-picked.
- Agents writing straight to the database: they set urgency to 'now' or leave it out (Queue). Anything else is refused. HQ never guesses from the wording.
- Owner actions on existing jobs (answer, send back, hand over, retry) keep the job's current level; handing a Now job to another agent wakes the new agent.

## Changes behind the scenes (need your approval)
- On the mailbox: `urgency` (now/queue, default queue), `urgent_since`, and a small wake-up history (who was woken, when, did it get through).
- A small table for each agent's wake-up method and address.
- A database trigger that fires when a job becomes Now, calling one new backend function that sends the ping; a scheduler every minute that handles the 15-minute steps. Both already exist in the project as tools (no new service).
- One new owner action: set urgency.

## Possible conflicts with the current Desk
- **Claimed but stuck.** Today "stuck" means claimed over 24 hours. For Now jobs I'd add a shorter "claimed but not finished in 2 hours" warning, or urgent jobs would go quiet once claimed. Say if you want that.
- **Questions to you** (needs_owner) don't wake agents; they already land in Needs you. A Now question just sorts first.
- **Social posts.** Agents post them daily already. I'd let a post be Now only on its post day (images for today's post), not by default, or the strip fills every morning.
- **Retry of a failed group** keeps Queue unless you flip it, so a 12-post retry doesn't fire 12 wake-ups.
- **Content Studio leases** are untouched; a claimed Studio task counts as picked up.
- **Muse and ChatGPT sign in as you**, so HQ can't tell from the login who flipped a job. The history will show "owner account" for those.

## Left out of version 1
Text-message alerts, wake-up quiet hours, priority levels beyond two, guessing urgency.

## Running cost
No new service fee. A minute-by-minute check and an occasional email cost nothing noticeable. Agent timers cost whatever each agent's own platform charges per check.

## Rough credits
About 8–12 credits, plus 1–2 per agent wake-up method you want tested live.

## Also ready
The Drive files plan and the AI Recommendation Seat plan are written; I'll show them again next.

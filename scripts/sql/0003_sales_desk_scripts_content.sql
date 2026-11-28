-- Sales desk scripts (outreach_templates rows, category sales_desk), adapted from the Sales Rep Packet 2026-11-25. Loaded live 2026-11-28; rerunnable (replaces only sales_desk rows).
begin;
delete from outreach_templates where category = 'sales_desk';
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$vm_script$scr$, $scr$Cold call: good reviews, no website$scr$, null, $scr$Before you dial: look them up on Google and note one detail from a recent review.

Open:
"Hi, I'm looking for the owner of {business}. ... This is {rep} with Supreme Team Media here in San Diego. I'll be quick. I was looking at {business} on Google. You've got {rating} stars and {reviews} reviews, and one of them says [the detail you noted]. That's a great record."
Stop and let them answer. People like hearing their own reviews.

The gap:
"Here's why I called. When someone finds you on Google and taps the website button, there's nothing there. A lot of people take that as a sign to tap the next name on the list, even with your reviews."

The ask:
"We build websites for local businesses, and we'd like to build a preview of yours for free. Your name, your services, your reviews, your phone number, built to look right on a phone. You'll see it tomorrow. If you like it, we talk about making it live. If you don't, you owe nothing and I leave you alone. Can I get that started for you?"

On a yes: tap Yes to free preview and ask the five questions on screen.

If they ask the price first:
"The preview is free. If you want it live, it's $300 a month with nothing down. That covers the website, managing your Google profile, a review request after every job, and a text back to anyone whose call you miss. Look at the preview first and then decide."

If someone else answers:
"Who handles the Google listing and the website for the business? ... What's the best time to catch them?" Get the name, say thank you, and tap Owner not in.$scr$, null, 100, true, $scr$no_website$scr$, $scr$opener$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$vm_script$scr$, $scr$Cold call: good reviews, weak website$scr$, null, $scr$Before you dial: open their website on your phone and note one thing that gets in the way (slow to load, tiny text, a phone number you can't tap, old information).

Open:
"Hi, I'm looking for the owner of {business}. ... This is {rep} with Supreme Team Media here in San Diego. I'll be quick. I was looking at {business} on Google. You've got {rating} stars and {reviews} reviews. That's a great record."
Stop and let them answer.

The gap:
"Here's why I called. I tapped through to your website on my phone and [the thing you noted]. Most people who look you up are on their phone, and when the site fights them, they tap the next name on the list."

The ask:
"We'd like to build you a free preview of a new site, built for phones, with your services, your reviews and your phone number. You'll see it tomorrow. If you like it, we talk about making it live. If you don't, you owe nothing. Can I get that started for you?"

If they want a custom site they own outright:
"That's our Standard Web package, and Sean handles those himself. Can I set up 30 minutes with him? Does [tomorrow at 10] or [Thursday at 2] work?" Then tap Intro call booked with Sean.

If someone else answers: get the owner's name and the best time, then tap Owner not in.$scr$, null, 101, true, $scr$weak_website$scr$, $scr$opener$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$vm_script$scr$, $scr$Cold call: any business$scr$, null, $scr$Before you dial: look them up on Google and note one detail from a recent review, and what's missing (no website, a site that's hard to use on a phone, or few reviews).

Open:
"Hi, I'm looking for the owner of {business}. ... This is {rep} with Supreme Team Media here in San Diego. I'll be quick. I was looking at {business} on Google, and one of your reviews says [the detail you noted]. That's a great record."
Stop and let them answer.

The gap:
"Here's why I called. [What's missing.] The moment someone finds you on Google is when they decide whether to call you or the next name on the list."

The ask:
"We'd like to build you a free preview of a website, with your name, your services, your reviews and your phone number, built to look right on a phone. You'll see it tomorrow. If you like it, we talk about making it live. If you don't, you owe nothing. Can I get that started for you?"

On a yes: tap Yes to free preview and ask the five questions on screen.
If someone else answers: get the owner's name and the best time, then tap Owner not in.$scr$, null, 102, true, $scr$any$scr$, $scr$opener$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$vm_script$scr$, $scr$Follow-up call: they reached out to us$scr$, null, $scr$These people asked for something. Start there.
"Hi {first_name}, this is {rep} with Supreme Team Media. You [ran our free Business Checkup / sent us a message / posted that you were looking for a website], and I wanted to follow up personally. What made you look into it?"
Let them tell you the problem in their words. Then:
"Got it. Here's what I'd suggest. [A free preview if they have no site or a weak one. An intro call with Sean if it's bigger than a website.] Does [tomorrow at 10] or [Thursday at 2] work?"
Always offer two specific times. "When are you free?" gets you "I'll let you know."$scr$, null, 103, true, $scr$hand_raise$scr$, $scr$opener$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$sms$scr$, $scr$First text: they reached out to us$scr$, null, $scr$Hi {first_name}, it's {rep} with Supreme Team Media. You reached out to us and I wanted to follow up personally. Is now a good time for a quick call, or is later today better?$scr$, null, 104, true, $scr$hand_raise$scr$, $scr$opener$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$vm_script$scr$, $scr$Bars and restaurants: get them in front of Sean$scr$, null, $scr$You are not selling on this call. You are getting the owner or general manager in front of Sean. Avoid the lunch rush and dinner service.
"I work with Supreme Team Media. We built and ran the operating system for an eight-venue bar group here in San Diego. Our program for bars and restaurants is called Full House: we run the venue's marketing, events and guest follow-up, and the owner sees the results every Monday. What's your slowest night right now?"
Let them talk about it. Then:
"That's what we go after: busier slow nights, more private events, more regulars. I'd like to set up 30 minutes with Sean, the founder. He'll look at the venue first and come with ideas specific to you. Who else should be in that conversation, and what does next week look like?"
Ask who else should be there every time. If the person you're talking to can't approve spending, you want the person who can on that call. Then tap Intro call booked with Sean.$scr$, null, 105, true, $scr$bar_restaurant$scr$, $scr$opener$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$vm_script$scr$, $scr$Someone you know$scr$, null, $scr$"Hi {first_name}, it's {rep}. [How you know them.] I'm working with Supreme Team Media now. We build the systems behind a business's website, the part that answers calls, follows up with customers and brings in reviews while the owner is busy running the place."
Then ask about them and listen for the opening:
"How do most of your customers find you right now?" or "What happens when someone calls and nobody can pick up?"
When they describe a problem we solve:
"That's exactly what we fix. I'd like to get you 30 minutes with Sean, our founder. He'll look at your setup before the call and tell you what he'd do. Does [tomorrow at 10] or [Thursday at 2] work?"$scr$, null, 106, true, $scr$network$scr$, $scr$opener$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$vm_script$scr$, $scr$Voicemail (20 seconds, try 2 only)$scr$, null, $scr$"Hi, this is {rep} with Supreme Team Media in San Diego, calling for the owner of {business}. I was looking at {business} on Google. {rating} stars, {reviews} reviews, and no website for those people to land on. We'd like to build you a free preview so you can see what it would look like. My number is [your number]. Again, {rep}, [your number]."
Leave one voicemail per business. After that, just call back without leaving another.$scr$, null, 107, true, $scr$no_website$scr$, $scr$voicemail$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$vm_script$scr$, $scr$Voicemail (20 seconds, try 2 only)$scr$, null, $scr$"Hi, this is {rep} with Supreme Team Media in San Diego, calling for the owner of {business}. I was looking at {business} on Google. {rating} stars from {reviews} reviews, and a website that's hard to use on a phone. We'd like to build you a free preview of a new one so you can see the difference. My number is [your number]. Again, {rep}, [your number]."
Leave one voicemail per business.$scr$, null, 108, true, $scr$weak_website$scr$, $scr$voicemail$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$vm_script$scr$, $scr$Voicemail (20 seconds, try 2 only)$scr$, null, $scr$"Hi, this is {rep} with Supreme Team Media in San Diego, calling for the owner of {business}. I was looking at {business} on Google and your reviews are great. We'd like to build you a free preview of a website so you can see what it would look like. My number is [your number]. Again, {rep}, [your number]."
Leave one voicemail per business.$scr$, null, 109, true, $scr$any$scr$, $scr$voicemail$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$vm_script$scr$, $scr$Voicemail: they reached out to us$scr$, null, $scr$"Hi {first_name}, this is {rep} with Supreme Team Media. You reached out to us and I wanted to follow up personally. My number is [your number]. Again, {rep}, [your number]."$scr$, null, 110, true, $scr$hand_raise$scr$, $scr$voicemail$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$sms$scr$, $scr$Text right after the yes$scr$, null, $scr$Hi {first_name}, it's {rep} from Supreme Team Media. Good talking with you. Your free website preview for {business} will be ready by {promised_time}. I'll text the link here and call you right after.$scr$, null, 111, true, $scr$any$scr$, $scr$text_after_yes$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$sms$scr$, $scr$Text when the preview is ready$scr$, null, $scr$Hi {first_name}, your preview for {business} is ready: {preview_link} Open it on your phone. I'll call you in a few minutes to walk you through it.$scr$, null, 112, true, $scr$any$scr$, $scr$preview_call$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$vm_script$scr$, $scr$The preview call: this is where you close$scr$, null, $scr$"Did you get a chance to open it? ... What did you think when you saw {business} on there?"
Let them talk. Whatever they like, agree with it. Whatever they want changed, write it down and say "easy, we'll change that."

Then explain what the site does behind the scenes:
"The page is the part you can see. Here's the part that makes you money. When someone calls and you're on a job, they get a text back from your business right away, so they don't call the next guy. After every job, your customer gets a text asking for a Google review, so your {reviews} reviews keep climbing. We manage your Google profile so you show up when people nearby search for {services}. And every call, text and message lands in one inbox."

The close:
"It's $300 a month. Nothing down, three months to start, then month to month. Do you want us to make it live?"
Say the price, ask the question, then stop talking. The next person who speaks should be them.

When they say yes:
"Great. Sean will send you the written price and the sign-up link today. Nothing is charged until you approve it. What's the best email for that?"
Then tap I closed it.$scr$, null, 113, true, $scr$any$scr$, $scr$preview_call$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$email$scr$, $scr$First email: no website$scr$, $scr$Free website preview for {business}$scr$, $scr$Hi {first_name},

I'm {rep} with Supreme Team Media in San Diego. I looked up {business} on Google: {rating} stars from {reviews} reviews, and no website for those people to land on.

We'd like to build you a free preview of your website, with your services, your reviews and your phone number, built to look right on a phone. You'd see it within a day, and you owe nothing either way.

If you'd like one, reply with the best number to text it to.

{rep}
Supreme Team Media$scr$, null, 114, true, $scr$no_website$scr$, $scr$email_first$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$email$scr$, $scr$First email$scr$, $scr$Free website preview for {business}$scr$, $scr$Hi {first_name},

I'm {rep} with Supreme Team Media in San Diego. I looked up {business} on Google and your reviews are great.

We'd like to build you a free preview of a website, with your services, your reviews and your phone number, built to look right on a phone. You'd see it within a day, and you owe nothing either way.

If you'd like one, reply with the best number to text it to.

{rep}
Supreme Team Media$scr$, null, 115, true, $scr$any$scr$, $scr$email_first$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$email$scr$, $scr$First email: they reached out to us$scr$, $scr$Following up from Supreme Team Media$scr$, $scr$Hi {first_name},

I'm {rep} with Supreme Team Media. You reached out to us, and I wanted to follow up personally.

What made you look into it? Reply here, or send me the best number and a good time, and I'll call you.

{rep}
Supreme Team Media$scr$, null, 116, true, $scr$hand_raise$scr$, $scr$email_first$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$vm_script$scr$, $scr$The offer and the prices you can quote$scr$, null, $scr$Lead with Local Growth on every cold call.

Local Growth: $300 a month, $0 down, three months to start, then month to month. A website we host and maintain, a managed Google Business Profile, review requests after every job, local SEO, missed calls answered with a text, and one inbox for calls, texts and messages. You close it.

Startup: $799 one time. Logo and brand colors, social media graphics, a beginner website built for phones, Google Business Profile set up correctly, and a contact form that sends leads to their phone. You close it.

Standard Web: $2,500 (half to start, half at launch), or $0 down at $297 a month for 12 months. Book Sean.
Operations: $5,000 setup. Book Sean.
Full House (bars and restaurants): Sean quotes it. Book Sean.
Anything else, like photography, video, branding, ads or publishing: don't quote it. Book Sean.

On Local Growth the site runs on our platform while they subscribe. On Standard Web the site is theirs once it's paid in full. Outside costs, like a domain name or ad spend, are agreed in writing before work starts.$scr$, null, 117, true, $scr$any$scr$, $scr$offer_facts$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$vm_script$scr$, $scr$What you can promise, and what you never promise$scr$, null, $scr$You can promise: a free website preview within 24 hours of a yes; a clear written price before any work starts; nothing is charged until the client approves it; a reply from us within one business day; Local Growth is three months to start, then month to month.

Never promise: a Google ranking, a number of calls, a number of reviews or a revenue figure; a discount, a free month or an extra; a launch date for anything beyond the preview; anything that isn't in the packet.

Never say or suggest you're calling from Google. Never take money, a card number or a signed agreement. Don't record a call.

When you don't know: "Good question, let me get you the exact answer from Sean." Get it the same day.$scr$, null, 118, true, $scr$any$scr$, $scr$offer_facts$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$vm_script$scr$, $scr$Referral ask (end of every good call)$scr$, null, $scr$"Last thing. Who else do you know that runs a business and doesn't have a website, or has one they're embarrassed by? I'll do the same free preview for them."
Use it at the end of every good conversation, whether it ended in a yes or a no.$scr$, null, 119, true, $scr$any$scr$, $scr$offer_facts$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$vm_script$scr$, $scr$I don't need a website. I get plenty of work from referrals.$scr$, null, $scr$"That's the best kind of business, and it's why your reviews are so good. Here's the thing: the people your customers refer look you up before they call. Right now they find reviews and no website. The preview is free. Take a look and decide."$scr$, null, 120, true, $scr$any$scr$, $scr$objection$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$vm_script$scr$, $scr$I'm busy right now.$scr$, null, $scr$"That's why I'll be quick. I'm not asking for a meeting. I'm asking if I can text you a free preview tomorrow. Yes or no works."$scr$, null, 121, true, $scr$any$scr$, $scr$objection$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$vm_script$scr$, $scr$Just send me some info.$scr$, null, $scr$"I can do better than info. I'll send you your own website preview, which tells you more than a brochure. What's the best number to text it to?"$scr$, null, 122, true, $scr$any$scr$, $scr$objection$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$vm_script$scr$, $scr$How much is it?$scr$, null, $scr$"The preview is free. Live, it's $300 a month, nothing down. See it first."$scr$, null, 123, true, $scr$any$scr$, $scr$objection$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$vm_script$scr$, $scr$$300 a month is too much.$scr$, null, $scr$"I hear you. What's one job worth to you? ... So if the site and the missed-call text bring you one extra job a month, it has paid for itself and the rest is profit. That's the bar it has to clear."$scr$, null, 124, true, $scr$any$scr$, $scr$objection$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$vm_script$scr$, $scr$I really can't afford it right now.$scr$, null, $scr$"No problem. Keep the preview link. When you're ready, text me and we'll turn it on. Who do you know that needs one?"$scr$, null, 125, true, $scr$any$scr$, $scr$objection$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$vm_script$scr$, $scr$Is there a contract?$scr$, null, $scr$"Three months to start, so the site and your Google profile have time to work. After that it's month to month and you can stop any time."$scr$, null, 126, true, $scr$any$scr$, $scr$objection$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$vm_script$scr$, $scr$Do I own the website?$scr$, null, $scr$"On the $300 plan it runs on our platform while you subscribe, and we maintain everything for you. If you'd rather own the site outright, that's our Standard Web package, and Sean can walk you through it."$scr$, null, 127, true, $scr$any$scr$, $scr$objection$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$vm_script$scr$, $scr$I got burned by a web guy before.$scr$, null, $scr$"A lot of owners tell us that. That's why you see the site before you pay anything, you get the price in writing before work starts, and nothing is charged until you approve it."$scr$, null, 128, true, $scr$any$scr$, $scr$objection$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$vm_script$scr$, $scr$My nephew is going to build it. / I'll do it on Wix.$scr$, null, $scr$"That'll get you a page. What we build also texts back the calls you miss, asks every customer for a review and keeps your Google profile working. Look at the preview next to what you were planning and pick the better one."$scr$, null, 129, true, $scr$any$scr$, $scr$objection$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$vm_script$scr$, $scr$I already have Facebook / Instagram / Yelp.$scr$, null, $scr$"Good, keep them. Those are rented space, and Google is where people go when they're ready to hire someone. The website is what turns that search into a call to you."$scr$, null, 130, true, $scr$any$scr$, $scr$objection$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$vm_script$scr$, $scr$Are you with Google?$scr$, null, $scr$"No. We're Supreme Team Media, a marketing company here in San Diego. We manage Google Business Profiles for our clients."$scr$, null, 131, true, $scr$any$scr$, $scr$objection$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$vm_script$scr$, $scr$Let me think about it.$scr$, null, $scr$"Of course. What's the one thing you want to think over? ... Fair. I'll call you [Thursday at 10]. Does that work?"
Then tap Follow-up set with that day and time.$scr$, null, 132, true, $scr$any$scr$, $scr$objection$scr$);
insert into outreach_templates (category, channel, name, subject, body, vertical, sort_order, is_active, lead_type, step) values ($scr$sales_desk$scr$, $scr$vm_script$scr$, $scr$Who are you guys again?$scr$, null, $scr$"Supreme Team Media. Marketing and design in San Diego since 2002. You can see our work at supremeteammedia.com/work."$scr$, null, 133, true, $scr$any$scr$, $scr$objection$scr$);
commit;

# Mr.Manager

---

**Bot Author:** [dnz_zz](https://discord.com/users/923205829166006272)  
**Source Code:** [https://github.com/dnx01/Mr.Manager](https://github.com/dnx01/Mr.Manager)

---

# Mr.Manager - Quick Usage Guide

## 1. Initial Setup

**1.1. Set the welcome channel:**
```
/setwelcome channel:#welcome-channel
```
Choose the channel where the bot will send welcome messages for new members.

**1.2. Configure the verification system:**
```
/setverification memberrole:@Member rorole:@RO engrole:@ENG notverifiedrole:@usernotverify verifiedrole:@verify
```
Choose the roles to be used for verification (all are required).

**1.3. Send the rules and verification button:**
```
/sendroles
```
The bot will post an embed with rules and buttons for verification. Users press the button and follow the verification flow.

## 2. Ticket System (Support)

**2.1. Set the staff roles that have access to tickets:**
```
/ticket setticketstaff staffrole1:@Staff [staffrole2:@Helper] [staffrole3:@Mod]
```
You can set up to 3 roles that will see the tickets.

**2.2. Send the ticket panel in a dedicated channel:**
```
/ticket setticketpanel
```
The bot will post an embed with an "Open Ticket" button. Users press it and a private channel with the staff is automatically created for them.

## 3. Moderation & Security Features

**3.1. Lockdown a user:**
```
/admin lockdown user:@User
```
Removes all roles from the user and gives them the lockdowned role (restricts all channels).

**3.2. Remove lockdown from a user:**
```
/admin unlockdown user:@User
```
Removes the lockdowned role from the user.

**3.3. Purge messages:**
```
/admin purge count:10
```
Deletes the last 10 messages in the current channel (max 100, only messages newer than 14 days).

**3.4. Announce in a channel:**
```
/admin announce channel:#announcements message:Your announcement here
```
Sends an announcement message to the specified channel.

**3.5. Ban, kick, timeout, and sanction info:**
```
/ban user:@User reason:Rule violation
/kick user:@User reason:Rule violation
/timeout user:@User duration:10m reason:Spam
/banlist
/timeoutlist
/sanctioninfo user:@User
```
All actions are logged, DM'd to the user, and visible in dropdowns for staff.

**3.6. Anti-nuke/raid protection:**
- Detects mass join, channel/role/ban/kick spam.
- Only the malicious user is lockdowned (not the whole server).
- All staff (with MANAGE_GUILD or ADMINISTRATOR) are DM'd instantly with details (malicious user, time, example lockdown command).
- Alerts are sent in staff channels and via DM.

## 4. Other Useful Commands

- `/setwelcome` – set the welcome channel
- `/setverification` – configure the verification flow
- `/sendroles` – send the rules and verification button
- `/ticket setticketpanel` – send the ticket panel
- `/ticket setticketstaff` – set staff roles for tickets
- `/banlist` – show banned users (dropdown)
- `/timeoutlist` – show timed out users (dropdown)
- `/sanctioninfo` – view sanction history (dropdown)

## 5. Recommendations
- Use only the buttons for verification and tickets, not slash commands for regular users.
- Make sure the roles set for verification and tickets exist and are correctly assigned to members.
- For any issues, check the permissions of channels and roles.
- Staff should keep DMs open to receive instant anti-nuke alerts.

---

**Mr.Manager** is modular, extensible, and easy to configure for any Discord server. All moderation actions are logged, DM'd, and visible to staff. Security is enforced at every step!
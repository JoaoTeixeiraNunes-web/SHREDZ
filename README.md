# Shredz Season 1

A premium, dark-mode fitness competition web app for a small group of friends.
Apple-inspired **Liquid Glass** UI, built with **vanilla HTML/CSS/JS + Supabase**,
hostable on **GitHub Pages**.

## Features
- Email/password login (Supabase Auth, passwords hashed server-side)
- User dashboard, animated leaderboard with podium, profile with progress chart
- Daily check-ins (submit -> pending -> admin approval, no auto points)
- Bank-style points ledger with correct running balances
- Admin: approve/reject, manually award/revoke points, create habits
- Weekly challenges (create, finalize 1st/2nd/3rd, auto-award)
- Voting (single winner or 1-10 rating), 24h countdown, one vote per user
- Realtime updates, toast notifications, confetti on points

## Security model (read this)
- **Supabase Auth** handles login + password hashing. There is no hardcoded password.
- **Row Level Security (RLS)** is the real authorization layer. The JS route guards
  are UX only.
- All point changes go through `SECURITY DEFINER` database functions that re-check
  admin rights and keep the ledger consistent.
- `js/config.js` contains only the **public anon key** + project URL (safe to commit).
  The **service_role key is never stored in this repo**.

## Setup (one time)
1. **Create a Supabase project** at supabase.com.
2. **Run the SQL** in the Supabase SQL Editor, in this order:
   1. `supabase/schema.sql`
   2. `supabase/policies.sql`
   3. `supabase/functions.sql`
   4. `supabase/realtime.sql`
3. **Create Storage buckets** (Storage -> New bucket), all **public**:
   `avatars`, `vote-images`, `progress-photos`, `challenge-banners`.
4. **Create accounts** (Authentication -> Users -> Add user, Auto Confirm ON) for
   the admin + each member. Emails can be fake (e.g. `joao@shredz.app`).
5. **Seed data:** put each Auth user's UID into `supabase/seed.sql` (it ships with
   the project's current IDs), then run it.
6. **Configure the app:** in `js/config.js` set `SUPABASE_URL` and
   `SUPABASE_ANON_KEY` (Project Settings -> API).

## Run locally
Because the app uses ES modules, open it through a local server (not `file://`):
```
python3 -m http.server 8000
# then visit http://localhost:8000/login.html
```

## Deploy to GitHub Pages
1. Push this repo to GitHub.
2. Repo **Settings -> Pages -> Build from branch**, pick your branch + `/root`.
3. Visit the published URL and sign in.

## File structure
```
index.html login.html dashboard.html profile.html leaderboard.html
history.html challenges.html votes.html checkins.html
admin/ admin-dashboard.html admin-users.html admin-checkins.html
       admin-challenges.html admin-votes.html admin-settings.html
css/   variables base components nav
js/    config supabase auth api ui shell  + js/pages/*
supabase/ schema.sql policies.sql functions.sql realtime.sql seed.sql
```



## Getting started

To make it easy for you to get started with GitLab, here's a list of recommended next steps.

Already a pro? Just edit this README.md and make it your own. Want to make it easy? [Use the template at the bottom](#editing-this-readme)!

## Add your files

* [Create](https://docs.gitlab.com/user/project/repository/web_editor/#create-a-file) or [upload](https://docs.gitlab.com/user/project/repository/web_editor/#upload-a-file) files
* [Add files using the command line](https://docs.gitlab.com/topics/git/add_files/#add-files-to-a-git-repository) or push an existing Git repository with the following command:

```
cd existing_repo
git remote add origin https://gitlab.com/shredzinc-group/shredzs1.git
git branch -M main
git push -uf origin main
```

## Integrate with your tools

* [Set up project integrations](https://gitlab.com/shredzinc-group/shredzs1/-/settings/integrations)

## Collaborate with your team

* [Invite team members and collaborators](https://docs.gitlab.com/user/project/members/)
* [Create a new merge request](https://docs.gitlab.com/user/project/merge_requests/creating_merge_requests/)
* [Automatically close issues from merge requests](https://docs.gitlab.com/user/project/issues/managing_issues/#closing-issues-automatically)
* [Enable merge request approvals](https://docs.gitlab.com/user/project/merge_requests/approvals/)
* [Set auto-merge](https://docs.gitlab.com/user/project/merge_requests/auto_merge/)

## Test and Deploy

Use the built-in continuous integration in GitLab.

* [Get started with GitLab CI/CD](https://docs.gitlab.com/ci/quick_start/)
* [Analyze your code for known vulnerabilities with Static Application Security Testing (SAST)](https://docs.gitlab.com/user/application_security/sast/)
* [Deploy to Kubernetes, Amazon EC2, or Amazon ECS using Auto Deploy](https://docs.gitlab.com/topics/autodevops/requirements/)
* [Use pull-based deployments for improved Kubernetes management](https://docs.gitlab.com/user/clusters/agent/)
* [Set up protected environments](https://docs.gitlab.com/ci/environments/protected_environments/)

***

# Editing this README

When you're ready to make this README your own, just edit this file and use the handy template below (or feel free to structure it however you want - this is just a starting point!). Thanks to [makeareadme.com](https://www.makeareadme.com/) for this template.

## Suggestions for a good README

Every project is different, so consider which of these sections apply to yours. The sections used in the template are suggestions for most open source projects. Also keep in mind that while a README can be too long and detailed, too long is better than too short. If you think your README is too long, consider utilizing another form of documentation rather than cutting out information.

## Name
Choose a self-explaining name for your project.

## Description
Let people know what your project can do specifically. Provide context and add a link to any reference visitors might be unfamiliar with. A list of Features or a Background subsection can also be added here. If there are alternatives to your project, this is a good place to list differentiating factors.

## Badges
On some READMEs, you may see small images that convey metadata, such as whether or not all the tests are passing for the project. You can use Shields to add some to your README. Many services also have instructions for adding a badge.

## Visuals
Depending on what you are making, it can be a good idea to include screenshots or even a video (you'll frequently see GIFs rather than actual videos). Tools like ttygif can help, but check out Asciinema for a more sophisticated method.

## Installation
Within a particular ecosystem, there may be a common way of installing things, such as using Yarn, NuGet, or Homebrew. However, consider the possibility that whoever is reading your README is a novice and would like more guidance. Listing specific steps helps remove ambiguity and gets people to using your project as quickly as possible. If it only runs in a specific context like a particular programming language version or operating system or has dependencies that have to be installed manually, also add a Requirements subsection.

## Usage
Use examples liberally, and show the expected output if you can. It's helpful to have inline the smallest example of usage that you can demonstrate, while providing links to more sophisticated examples if they are too long to reasonably include in the README.

## Support
Tell people where they can go to for help. It can be any combination of an issue tracker, a chat room, an email address, etc.

## Roadmap
If you have ideas for releases in the future, it is a good idea to list them in the README.

## Contributing
State if you are open to contributions and what your requirements are for accepting them.

For people who want to make changes to your project, it's helpful to have some documentation on how to get started. Perhaps there is a script that they should run or some environment variables that they need to set. Make these steps explicit. These instructions could also be useful to your future self.

You can also document commands to lint the code or run tests. These steps help to ensure high code quality and reduce the likelihood that the changes inadvertently break something. Having instructions for running tests is especially helpful if it requires external setup, such as starting a Selenium server for testing in a browser.

## Authors and acknowledgment
Show your appreciation to those who have contributed to the project.

## License
For open source projects, say how it is licensed.

## Project status
If you have run out of energy or time for your project, put a note at the top of the README saying that development has slowed down or stopped completely. Someone may choose to fork your project or volunteer to step in as a maintainer or owner, allowing your project to keep going. You can also make an explicit request for maintainers.

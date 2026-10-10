# Security

This is a static website. Sign-in and progress sync use Google Firebase; no passwords or admin keys are stored in this repository.

## Reporting a problem

Please report privately: open **Security → Report a vulnerability** on this repository. Do not post details in a public issue. You will get a reply as soon as the maintainer can respond.

## What is protected

- Progress is stored in Firestore under each person's own account only; the rules in `FIRESTORE_RULES.txt` deny everything else.
- The site sets a strict Content-Security-Policy and loads no third-party scripts apart from Firebase when someone signs in.
- Dependencies and workflows are updated by Dependabot and scanned by CodeQL.

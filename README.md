# ProofResearch

> **From information to evidence. From evidence to proof.**  
> *Collaborative Research Ecosystem — Gardenia 2K26 Hackathon Prototype*

---

## 🔬 Product Vision & Executive Summary

**ProofResearch** is a collaborative research platform designed to connect research sponsors, domain experts, students, and administrators into verified, access-controlled research teams.

Unlike existing marketplaces or code repositories, ProofResearch introduces a **verifiable chain of evidence** demonstrating what research was conducted, who contributed, how confidential data was protected, and why each contributor received their fair share of credit or financial reward.

### Core Engineering Principle

> **"AI proposes. Humans approve. The ledger records."**

---

## 🎯 Key Differentiators

1. **Tamper-Evident SHA-256 Hash-Chain Ledger**  
   Complete append-only provenance tracking for project actions, charter acceptances, contributions, and reward payouts, with real-time integrity verification and breaking-hash detection.

2. **Public vs. Confidential Information Separation**  
   Public project summaries are open for discovery, while confidential research briefs are restricted until explicit digital charter acceptance.

3. **AI Research Scoping & Scoped AI Agent**  
   Server-side LLM integration generates structured milestones and workspace assistance, bounded by human ownership and approval gates.

4. **Explainable Researcher Matching**  
   Transparent scoring algorithm:
   - Skills — 50%
   - Experience — 20%
   - Availability — 20%
   - Interest — 10%

   Every recommendation includes a human-readable rationale.

5. **Deterministic Fair Reward Engine**  
   Rules-based mathematical allocation combining milestone role splits and reviewed contribution impact weights.

6. **Support for Non-Monetary Projects**  
   Recognition through credentials, co-authorship, badges, and institutional recommendations without implying monetary compensation.

---

## 🏗️ Technology Stack

### Frontend
- React 18
- Vite
- TypeScript
- Tailwind CSS
- Lucide React

### Backend & Database
- Supabase
- PostgreSQL 15
- Row Level Security (RLS)
- Supabase Edge Functions

### Security & Integrity
- PostgreSQL Row Level Security
- SHA-256 hash-chained contribution ledger
- Access-controlled confidential project data
- Audit logging

### AI
- Server-side LLM API
- Supabase Edge Functions
- 

---

## 🛠️ Quick Start & Local Setup


- Node.js 18+
- npm
- Supabase account and project
- Alternatively, a local Supabase CLI environment

### 1. Clone & Install

```bash
git clone <REPOSITORY_URL>
cd ProofResearch
npm install
```

### 2. Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Populate the required variables:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```


---

# 📑 Official Demonstration Flow

The live demonstration follows the Gardenia 2K26 common scenario:

### 1. POST
Sponsor posts:

**Low-cost detection of diabetic retinopathy from fundus images on edge devices**

Budget: **₹1,00,000**

### 2. SCOPE
AI proposes research milestones and required skills.

Sponsor reviews and approves the proposed scope.

### 3. MATCH
The matching engine recommends suitable researchers with an explainable scoring rationale.

### 4. JOIN
A student reviews and explicitly accepts **Charter v1.0**.

Acceptance unlocks access to the confidential project brief.

### 5. FUND
Milestone 1 is funded into simulated escrow.

### 6. WORK
Researchers and AI agents collaborate within the project workspace.

Every AI action is associated with a human owner.

### 7. CATCH
A similarity/integrity check flags suspicious overlap.

An expert reviews and resolves the issue.

### 8. ACCEPT & REWARD
The milestone is accepted.

The reward engine produces an explainable breakdown of each contributor's share.

### 9. VERIFY & TAMPER
The ledger initially verifies as:

```text
VALID
```

A controlled administrative tamper test modifies an old ledger entry.

The system detects the inconsistency and reports:

```text
HASH CHAIN BROKEN
```

### 10. NON-MONETARY PROJECT
A knowledge-sharing project demonstrates a ₹0 monetary model with:

- Co-authorship
- Credentials
- Badges
- Institutional recognition

---

# 🔐 Trust, Security & Integrity

ProofResearch treats security and integrity as core platform functionality.

| Threat | Mechanism |
|---|---|
| Plagiarism / undisclosed AI | Similarity checking, AI-use declaration and review |
| Insider theft | Access controls and disclosure restrictions |
| Sponsor misuse | Simulated escrow and acceptance controls |
| Credit theft | Tamper-evident contribution ledger |
| Fake accounts | Role and identity verification mechanisms |
| AI data leakage | Scoped agent access and approval boundaries |
| Prompt injection | Agent boundaries and human approval |
| Bait-and-switch terms | Versioned project charter |
| Ledger tampering | Append-only SHA-256 hash chain |

---

# 📜 Project Charter, IP & Contribution Principles

Every project on ProofResearch is intended to operate under an explicit **Project Charter** before work begins.

The charter defines:

- Engagement model
- Project scope
- Milestones and deliverables
- Acceptance criteria
- Roles and eligibility
- IP ownership
- Licensing terms
- Authorship
- Publication and embargo conditions
- Confidentiality requirements
- Credit and reward allocation
- Exit and dispute mechanisms
- Future commercialisation terms

### Charter Acceptance

Participants explicitly accept a specific charter version before beginning project work.

Any material change creates a new charter version requiring re-acceptance from affected participants.

The accepted charter version is recorded in the contribution ledger.

### Credit

Every accepted contribution is associated with the person who made or directed the contribution.

AI systems do not independently receive authorship or reward. AI-generated work is attributed to the responsible human owner who directed and reviewed it.

> **AI does not earn; the human who directs and reviews the work receives credit.**

---

# 💰 Engagement & Reward Models

ProofResearch supports multiple engagement models.

### Funded

- Milestone-based payments
- Simulated escrow
- Credit
- Reputation
- Credentials

### Stipend / Honorarium

- Fixed amount stated before work begins
- Credit and recognition

### Knowledge Sharing

- No monetary payment
- Certificates
- Badges
- Co-authorship
- Mentorship
- Recommendations

### Institutional Credit

- Project credit
- Internship credit
- Course/institutional recognition

The engagement model is disclosed before participation.

---

# 🧮 Fair Reward Engine

For funded projects, the reward engine combines:

1. Agreed role-level allocation
2. Reviewed contribution impact
3. Configurable project percentages
4. Milestone acceptance
5. Applicable platform and AI-compute allocations

Contribution shares are based on **reviewed impact rather than raw commit counts**.

The percentages are configurable according to the project charter.

---

# 🤖 AI Tool Declaration

AI-assisted development and AI services used during the project are declared here in accordance with the Gardenia hackathon submission requirements.

### AI Coding / Development Tools

- **Antigravity** — AI-assisted development, code generation, debugging, refactoring, and implementation support.
- **ChatGPT** — Architecture planning, technical reasoning, debugging assistance, documentation, and development guidance.

### AI Runtime Services

- Server-side LLM API
- Supabase Edge Functions

### AI Governance Principle

AI-generated output is not treated as an independent contributor.

The platform records the responsible human owner associated with AI-assisted actions.

> **AI proposes. Humans approve. The ledger records.**

---

# 👥 Demo Accounts

| Role | Name | Email / Handle | Access |
|---|---|---|---|
| **Sponsor** | MedVision Labs | `sponsor@medvision.io` | Project posting, escrow funding, milestone approval |
| **Expert** | Dr. Ananya Rao | `ananya@research.edu` | Review, peer assessment, dispute mediation |
| **Student** | Rahul Sharma | `rahul@student.edu` | Candidate, charter acceptance, workspace contributor |
| **Student** | Priya Patel | `priya@student.edu` | Candidate, contributor |
| **Admin** | System Admin | `admin@proofresearch.org` | Ledger audit, controlled integrity test |

> These are demonstration identities for the prototype. No real personal data or real financial transactions are used.

---

# 🚀 Future Development

The hackathon prototype provides the foundation for further development.

Potential production enhancements include:

- Advanced plagiarism and AI-content detection
- Watermarking and leak tracing
- Stronger conflict-of-interest detection
- Multi-agent research workflows
- Human approval gates
- Advanced prompt-injection protection
- Production payment and escrow infrastructure
- Configurable contribution scoring
- Dispute resolution workflows
- Anti-collusion mechanisms
- Skill-graph matching
- Learning paths
- Blockchain anchoring of ledger hashes
- W3C Verifiable Credentials
- Self-hosted LLM support
- University analytics
- Mobile-first interfaces

---

This repository contains the **Gardenia 2K26 hackathon prototype** and its supporting documentation.

The repository is intended to enable continued technical development of ProofResearch.

### Repository Contents

The repository may contain:

- Application source code
- Database schema and migrations
- Security and RLS definitions
- AI integration code
- Ledger implementation
- Reward engine
- Seed/demo data
- Architecture and product documentation
- Development records

### Security

Before deployment, configure all production credentials through secure environment variables or a secrets-management system.

Do not commit:

- `.env` files
- API keys
- Supabase service-role keys
- Database passwords
- OAuth secrets
- Private certificates
- Production credentials

---

# 📜 Intellectual Property, Ownership & Project Rights

Developed for the **Gardenia 2K26 Hackathon**.

Copyright © 2026 **Nived / Nivet2006**.

**All rights reserved.**

Official GitHub repository:  
https://github.com/Nivet2006/

---

## 1. Project Ownership

The Project, including its source code, architecture, software, documentation,
UI/UX designs, original graphics, original 3D assets, configurations,
original databases, project-specific implementations, documentation and other
original materials created specifically for the Project, shall be owned by
**Nived / Nivet2006**, subject to applicable law and any third-party
intellectual-property rights.

The GitHub repository located under the **Nivet2006** GitHub account is the
official repository and primary source of the Project.

Ownership of the Project is not determined solely by GitHub account ownership;
where contributions are made by other individuals, the applicable intellectual
property rights shall be governed by the written agreements and assignments
applicable to those contributions.

---

## 2. Intellectual Property Assignment

Each contributor who contributes original work specifically for this Project
agrees, to the maximum extent permitted by applicable law, to assign to
**Nived / Nivet2006** all transferable intellectual-property rights that the
contributor owns in such Project-specific contribution.

Such rights include, where legally transferable:

- reproduction;
- modification;
- adaptation;
- publication;
- distribution;
- communication to the public;
- creation of derivative works;
- commercialisation;
- licensing;
- sublicensing;
- incorporation into future products;
- maintenance and further development; and
- other lawful exploitation of the contribution.

Any assignment shall be interpreted in accordance with the applicable
requirements of the **Copyright Act, 1957** and other applicable Indian law.

Where a particular right cannot legally be assigned, the contributor grants
Nived / Nivet2006 an irrevocable, worldwide, perpetual, royalty-free,
transferable and sublicensable licence to exercise that right to the maximum
extent permitted by law.

---

## 3. No Unilateral Withdrawal of Assigned Rights

Once a contributor has validly assigned or licensed Project-specific
intellectual-property rights to **Nived / Nivet2006**, the contributor shall
not unilaterally revoke, withdraw, terminate or otherwise invalidate those
rights, except where such revocation or termination is expressly required or
permitted by applicable law.

A contributor leaving the Project, leaving the team, losing repository access,
discontinuing participation or disagreeing with future development of the
Project shall not, by itself, terminate rights that have already been validly
assigned or licensed.

---

## 4. Repository Administration and Control

The official GitHub repository under:

**https://github.com/Nivet2006/**

shall remain under the administrative control of **Nived / Nivet2006**, subject
to GitHub's applicable terms, policies and technical controls.

Repository permissions, collaborator access, branches, releases, deployment
credentials and other technical privileges may be administered by the
repository owner.

Repository access does not, by itself, grant any contributor ownership of the
Project or any right to independently control, transfer or commercialise the
Project.

Nothing in this section overrides mandatory legal rights or rights belonging
to GitHub or other third parties.

---

## 5. Project Continuity

The Project and its intellectual-property rights are intended to continue
regardless of:

- completion of the Gardenia 2K26 Hackathon;
- submission or evaluation of the Project;
- withdrawal of a contributor;
- departure of a contributor from the team;
- changes in the development team;
- changes in repository collaborators;
- changes in hosting infrastructure;
- future redevelopment of the Project;
- incorporation of the Project into another product; or
- future commercialisation.

No contributor's departure shall, by itself, transfer ownership or control of
the Project.

---

## 6. Commercialisation

Subject to applicable law, third-party licences and pre-existing contractual
rights, **Nived / Nivet2006** shall have the right to determine whether the
Project may be:

- commercialised;
- licensed;
- sublicensed;
- modified;
- distributed;
- incorporated into another product or service;
- transferred; or
- further developed.

No contributor may independently sell, license, commercialise or distribute
Project-specific material belonging to Nived / Nivet2006 without prior written
authorisation.

---

## 7. Contributor Recognition

Contributors may receive appropriate credit for their genuine contributions.

Attribution or contributor recognition does not, by itself, grant ownership,
repository administration rights, commercial rights or control over the
Project.

Nothing in this section transfers ownership of intellectual property that a
contributor demonstrably owned before the Project and did not assign or
license to the Project.

---

## 8. Pre-Existing and Third-Party Intellectual Property

Nothing in this document transfers ownership of intellectual property that:

1. existed independently before the Project;
2. was independently developed outside the Project; or
3. belongs to a third party.

Third-party software, libraries, frameworks, APIs, datasets, fonts, images,
3D models, trademarks and other external materials remain subject to their
respective licences and terms.

Where third-party material is incorporated into the Project, its original
licence shall continue to apply.

---

## 9. Confidentiality and Project Materials

Unless already publicly disclosed or otherwise authorised, contributors shall
not knowingly disclose or distribute confidential Project information,
including:

- private source code;
- credentials;
- API keys;
- deployment information;
- unpublished designs;
- private documentation;
- proprietary technical information; or
- other confidential Project materials.

This obligation shall continue after a contributor leaves the Project, subject
to applicable law.

---

## 10. No Implied Transfer

A contribution, Git commit, pull request, issue, branch, design, document,
repository invitation or participation in the Project shall not by itself
transfer ownership of the Project to another person.

Any transfer of ownership or intellectual-property rights must comply with
applicable law and the relevant written agreement.

---

## 11. Governing Law

This Project and any agreement concerning ownership, intellectual property,
contributions, confidentiality, commercialisation or repository control shall,
to the extent legally permissible, be governed by the **laws of India**.

The parties intend that applicable laws in force in the **State of Karnataka,
India** shall apply where relevant.

---

## 12. Jurisdiction

Subject to applicable law, the parties agree that courts having competent
jurisdiction in **Bengaluru, Karnataka, India** shall have jurisdiction over
disputes arising from or relating to this Project, its ownership,
intellectual-property rights, contributions, confidentiality,
commercialisation or interpretation of these terms.

Nothing in this clause prevents a party from seeking urgent interim,
injunctive or protective relief from another court of competent jurisdiction
where legally permitted or required.

---

## 13. Electronic Acceptance

Where legally permissible, acceptance of a written contributor agreement,
including acceptance through an electronic record or electronic signature,
shall be treated in accordance with applicable Indian law.

Electronic contracts are not unenforceable merely because the relevant
communications were made electronically, subject to the requirements and
exceptions under applicable law.

---

## 14. Survival

The provisions concerning:

- intellectual-property ownership;
- assignment;
- licensing;
- confidentiality;
- commercialisation;
- repository control;
- dispute resolution; and
- governing law

shall survive the completion, termination or discontinuation of the Project to
the extent permitted by applicable law.

---

## 15. Entire Understanding

This section expresses the intended Project-level ownership and rights
framework.

Where a separate signed agreement exists between the Rights Holder and a
contributor, that agreement shall govern the specific rights and obligations
of the parties to the extent of any inconsistency.

Any amendment, waiver or transfer of Project intellectual-property rights
should be made in writing and authorised by the relevant rights holder.

---

### Rights Holder

**Name:** Nived  
**GitHub:** Nivet2006  
**Official Repository:** https://github.com/Nivet2006/ProofResearch 
**Location:** Karnataka, India  
**Primary Jurisdiction:** Bengaluru, Karnataka, India  
**Year:** 2026

**Copyright © 2026 Nived / Nivet2006. All rights reserved.**



The repository is provided for evaluation and continued technical development of the hackathon prototype.

The Project Charter governs applicable ownership, licensing, authorship, confidentiality, contribution-credit and future-commercialisation terms.

**No transfer of intellectual property ownership is implied solely by providing or submitting this repository.**

Any separate assignment, licensing arrangement, commercialisation agreement, or transfer of intellectual property rights must be explicitly agreed upon by the relevant parties.

---

# 🏆 Hackathon

**Gardenia 2K26 Hackathon**

**Challenge:** Collaborative Research Ecosystem

**Result:** 🥇 **First Prize**

> **From information to evidence. From evidence to proof.**

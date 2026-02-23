# Spolupracovníci – EB-EU-s-r-o/nimble-agenda

## Overený stav (gh api 2026-02-23)

**Repo:** [EB-EU-s-r-o/nimble-agenda](https://github.com/EB-EU-s-r-o/nimble-agenda)

### Aktuálni colaboratori (už v repozitári)

| GitHub username      | Rola  | Stav   |
|----------------------|-------|--------|
| youh4ck3dme          | admin | aktívny |
| erikbabcan-commits   | admin | aktívny |

### Čakajúce pozvánky (treba prijať na GitHube / mail)

| GitHub username | Odoslané   | Stav   |
|-----------------|------------|--------|
| H4ck3d          | 2026-02-23 | čaká na prijatie |
| you             | 2026-02-23 | čaká na prijatie |

**Kde pozvánku prijať – krok za krokom**

- **Kto to robí:** Ten, kto dostal pozvánku (účet **H4ck3d** alebo **you**). Musí byť na GitHube prihlásený práve pod tým účtom.

**Možnosť A – Notifikácie (najrýchlejšie)**  
1. Otvor: **https://github.com/notifications**  
2. Prihlás sa ako **H4ck3d** alebo **you** (ak si tam nie si).  
3. Na stránke skroluj alebo hľadaj položku s textom **„Invitation“** alebo **„EB-EU-s-r-o/nimble-agenda“**.  
4. Klikni na ňu, potom na zelené tlačidlo **„Accept“** (prijať).

**Možnosť B – Repozitár**  
1. Otvor: **https://github.com/EB-EU-s-r-o/nimble-agenda**  
2. Si prihlásený ako **H4ck3d** alebo **you**.  
3. Hore pod horným menu uvidíš žltý / oranžový pruh s textom, že máš pozvánku.  
4. Klikni v ňom na **„Accept invitation“**.

**Možnosť C – E-mail**  
1. Pozri si **e-mail** (aj priečinok spam) na adrese prepojenú s účtom **H4ck3d** alebo **you**.  
2. Nájdi mail od **GitHub** („You're invited to collaborate…“).  
3. V maile klikni na **„Accept invitation“** alebo **„View invitation“** a potom **„Accept“**.

**Ak to stále nevidíš:**  
- Skontroluj, či si na **github.com** prihlásený pod správnym účtom (pravý horný roh – avatar / meno). Pre **h4ck3d@h4ck3d.me** / **you@h4ck3d.me** to musia byť účty **H4ck3d** a **you**.  
- Ak si teraz prihlásený ako **youh4ck3dme**, odhlás sa (Settings → Sign out) a prihlás sa ako **H4ck3d** alebo **you**, potom znova otvor **https://github.com/notifications**.

### Mapovanie email → GitHub

| Email                 | GitHub username     | Stav        |
|-----------------------|---------------------|-------------|
| youh4ck3dme@gmail.com | youh4ck3dme         | v repozitári |
| erikbabcan@gmail.com  | erikbabcan-commits  | v repozitári |
| h4ck3d@h4ck3d.me      | H4ck3d              | pozvánka čaká |
| you@h4ck3d.me         | you                 | pozvánka čaká |

---

## Príkazy na overenie (copy-paste)

```powershell
gh api /repos/EB-EU-s-r-o/nimble-agenda/collaborators
gh api /repos/EB-EU-s-r-o/nimble-agenda/invitations
```

## Pridanie ďalšieho colaboratora (push)

```powershell
gh api --method PUT /repos/EB-EU-s-r-o/nimble-agenda/collaborators/GITHUB_USERNAME -f permission=push
```

Nahraď `GITHUB_USERNAME` skutočným menom na GitHube.

# FreePBX sur Coolify — Guide d'installation

## 1. Déploiement Coolify

- Mode : **Docker Compose**
- Désactiver Traefik proxy (incompatible avec `network_mode: host`)
- Accès admin : `https://ip-serveur:8443`

## 2. Firewall — ports à ouvrir

| Port | Proto | Usage |
|------|-------|-------|
| 5060 | UDP | SIP |
| 4569 | UDP | IAX |
| 8443 | TCP | Admin HTTPS |
| 10000–20000 | UDP | RTP (audio) |

## 3. Trunk OVH (PJSIP)

FreePBX → Connectivity → Trunks → Add SIP (chan_pjsip)

```
Trunk Name:       OVH
Outbound CID:     0033XXXXXXXXX

PJSIP Settings:
  Username:       0033XXXXXXXXX
  Auth Username:  0033XXXXXXXXX
  Secret:         [mot de passe SIP OVH]
  SIP Server:     sip.ovh.fr
  SIP Server Port: 5060
  Context:        from-trunk
  Transport:      udp
  Codec:          alaw, ulaw
  DTMF Mode:      rfc4733
  Qualify Frequency: 60
```

OVH → Espace client → Telecom → Téléphonie → ta ligne → Activer SIP/Trunk

- Outbound Route : pattern `0.` → trunk OVH
- Inbound Route : DID = ton numéro → extension ou IVR

## 4. Provisioning Yealink (T46/T48/T53/T54)

Sur chaque téléphone :
- Account → Register → SIP Server = IP FreePBX, port 5060
- User/Auth = numéro d'extension FreePBX
- Password = secret de l'extension FreePBX

Module optionnel : **OSSEndPoint** (EndPoint Manager libre)

## 5. Intégration Odoo (asterisk_click2dial)

```bash
# Depuis ton serveur Odoo
git clone https://github.com/OCA/telephony.git
# Modules à installer : asterisk_click2dial + base_phone
```

Config Odoo → Paramètres → Téléphonie Asterisk :
- Serveur AMI : IP FreePBX, port 5038
- User/Password AMI : créer dans FreePBX → Settings → Advanced → AMI
- Outbound prefix : `0`
- Context : `from-internal`

Résultat : click-to-call depuis fiches contacts/CRM + popup à la réception.

## 6. OnlyOffice ↔ Odoo ↔ PBX

- Connecteur : [onlyoffice-odoo](https://github.com/ONLYOFFICE/onlyoffice-odoo)
- Enregistrements Asterisk : `/var/spool/asterisk/monitor/`
- Pipeline : enregistrement → attach Odoo → transcription Whisper → doc OnlyOffice

## 7. Ordre de mise en place recommandé

1. FreePBX Docker sur Coolify (1-2h)
2. Trunk OVH + 1 DID de test (30min)
3. Provisioning 1 Yealink pour valider (15min)
4. Module Odoo asterisk_click2dial (1h)
5. Avatar vocal filtrage hors-heures (demi-journée)

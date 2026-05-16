"""
Utilitaire pour générer le hash SHA-256 de ton mot de passe.
Usage: python hash_password.py
Copier le résultat dans ADMIN_PASSWORD_HASH dans docker-compose.yml
"""
import hashlib, getpass

password = getpass.getpass("Mot de passe admin: ")
hash_val = hashlib.sha256(password.encode()).hexdigest()
print(f"\nADMIN_PASSWORD_HASH={hash_val}")
print("\nCopier cette valeur dans docker-compose.yml → environment → ADMIN_PASSWORD_HASH")

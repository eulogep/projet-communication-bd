"""Reproduit le bug de la case 3 (histoire A) pour en faire une vraie capture d'écran.

Lancer :  python3 demo_erreur_integration.py
Puis capture d'écran du terminal (Mac : Cmd + Maj + 4, puis Espace pour capturer la fenêtre).
"""

ROUGE = "\033[1;31m"
FIN = "\033[0m"


# --- Partie de Karim : la page de connexion (codée « en anglais ») ---
def page_connexion():
    return {"login": "lea.martin", "password": "********"}


# --- Partie de Yanis : la base de données (codée « en français ») ---
UTILISATEURS = {"lea.martin": "Léa Martin"}


def verifier_utilisateur(donnees):
    return UTILISATEURS[donnees["identifiant"]]


# --- Assemblage, le jour du rendu, 8h52 ---
if __name__ == "__main__":
    print("Lancement de l'application du groupe 4...")
    try:
        print("Bienvenue,", verifier_utilisateur(page_connexion()))
    except KeyError as champ:
        print(f'{ROUGE}ERREUR : champ "{champ.args[0]}" introuvable{FIN}')

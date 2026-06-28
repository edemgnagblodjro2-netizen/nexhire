import os

# Seuil k-anonymat : une case agrégée sous ce nombre de participants
# n'est jamais exposée (protège l'identification indirecte — Loi 25).
K_ANON_MIN = int(os.getenv("K_ANON_MIN", "5"))

# Secret partagé pour marquer une session comme test (header X-Test-Session).
# Si vide/non défini, AUCUNE session ne peut être marquée test — comportement sûr par défaut.
TEST_SESSION_SECRET = os.getenv("TEST_SESSION_SECRET", "")

import os

# Seuil k-anonymat : une case agrégée sous ce nombre de participants
# n'est jamais exposée (protège l'identification indirecte — Loi 25).
K_ANON_MIN = int(os.getenv("K_ANON_MIN", "5"))

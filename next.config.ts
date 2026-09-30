import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Le foto degli annunci stanno nello spazio di archiviazione di Supabase, che
// è un altro dominio: next/image lo serve solo se dichiarato qui.
// L'indirizzo si ricava dalla variabile d'ambiente invece di scriverlo fisso:
// il progetto Supabase è già cambiato una volta, e un dominio incollato a mano
// sarebbe l'ennesima cosa da ricordarsi di aggiornare.
const hostSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: hostSupabase
      ? [{ protocol: "https", hostname: hostSupabase, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
};

export default withNextIntl(nextConfig);

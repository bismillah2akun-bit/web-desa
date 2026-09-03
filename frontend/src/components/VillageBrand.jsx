import { Link } from "react-router-dom";
import villageLogo from "@/assets/logo.png";

export default function VillageBrand() {
  return (
    <Link
      to="/"
      aria-label="Beranda Desa Tanjungjaya"
      className="relative flex h-10 w-20 shrink-0 items-center md:h-11 md:w-24"
    >
      <img
        src={villageLogo}
        alt="Logo Desa Tanjungjaya CANTIK"
        className="absolute left-0 top-1/2 h-20 w-20 -translate-y-1/2 object-contain md:h-24 md:w-24"
      />
    </Link>
  );
}

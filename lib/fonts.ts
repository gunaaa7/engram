import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";

export const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "800"],
});

export const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

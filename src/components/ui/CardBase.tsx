import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * CardBase — alias canônico para Card.
 * Mantém todas as variações (Header/Title/Description/Content/Footer).
 * Não criar divs estilizadas como cards manualmente.
 */
export const CardBase = Card;
export const CardBaseHeader = CardHeader;
export const CardBaseTitle = CardTitle;
export const CardBaseDescription = CardDescription;
export const CardBaseContent = CardContent;
export const CardBaseFooter = CardFooter;

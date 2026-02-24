import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <div className="min-h-screen safe-x safe-y bg-background text-foreground">
      <div className="container max-w-3xl py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Zmluvné podmienky</CardTitle>
            <p className="text-sm text-muted-foreground">PAPI Hair Design · booking.papihairdesign.sk</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-4">
            <section>
              <h2 className="text-lg font-semibold mt-4">1. Úvod</h2>
              <p>Tieto zmluvné podmienky upravujú používanie rezervačnej služby a webovej aplikácie PAPI Hair Design (ďalej „služba“). Používaním služby súhlasíte s týmito podmienkami.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold mt-4">2. Poskytovanie služby</h2>
              <p>Služba umožňuje online rezerváciu termínov. Rezervácia je záväzná po jej potvrdení. Prevádzkovateľ si vyhradzuje právo odmietnuť alebo zrušiť rezerváciu v odôvodnených prípadoch.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold mt-4">3. Zrušenie a zmeny</h2>
              <p>Zrušenie alebo zmena termínu je možné podľa pravidiel prevádzkovateľa (napr. v dostatočnom predstihu). Pravidlá zrušenia môžu byť uvedené pri rezervácii alebo na vyžiadanie.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold mt-4">4. Ochrana osobných údajov</h2>
              <p>Spracovanie osobných údajov pri používaní služby upravujú <Link to="/privacy" className="text-primary underline hover:no-underline">Zásady ochrany osobných údajov</Link>.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold mt-4">5. Zodpovednosť</h2>
              <p>Prevádzkovateľ neodpovedá za nepriame škody alebo výpadky služby spôsobené technickými poruchami alebo tretími stranami. Služba sa poskytuje „tak ako je“ v rámci bežnej dostupnosti.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold mt-4">6. Zmeny podmienok</h2>
              <p>Prevádzkovateľ môže tieto zmluvné podmienky meniť; zmeny zverejní na tejto stránke. Pokračovaním používania služby po zverejnení zmien súhlasíte s aktualizovanými podmienkami.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold mt-4">7. Kontakt</h2>
              <p>Otázky k zmluvným podmienkam: prostredníctvom webu booking.papihairdesign.sk alebo priamo v salóne PAPI Hair Design, Košice.</p>
            </section>
            <p className="text-muted-foreground text-sm mt-6">Posledná aktualizácia: február 2026.</p>
          </CardContent>
        </Card>
        <p className="mt-6 text-center">
          <Link to="/" className="text-primary underline hover:no-underline">Späť na úvod</Link>
        </p>
      </div>
    </div>
  );
}

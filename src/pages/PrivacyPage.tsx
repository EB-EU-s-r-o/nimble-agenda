import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen min-h-[100dvh] safe-x safe-y bg-background text-foreground">
      <div className="container max-w-3xl py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Zásady ochrany osobných údajov</CardTitle>
            <p className="text-sm text-muted-foreground">PAPI Hair Design · booking.papihairdesign.sk</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-4">
            <section>
              <h2 className="text-lg font-semibold mt-4">1. Správca údajov</h2>
              <p>Správcom osobných údajov je PAPI Hair Design (ďalej „my“). Kontakt: prostredníctvom webu booking.papihairdesign.sk.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold mt-4">2. Aké údaje zbierame</h2>
              <p>Pri rezervácii a prihlásení môžeme spracovávať: meno, e-mail, telefón, údaje o objednávkach a preferenciách. Pri prihlásení cez Google/Apple používame údaje poskytnuté týmto poskytovateľom (e-mail, meno) v rozsahu ich súhlasu.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold mt-4">3. Účel a právny základ</h2>
              <p>Údaje používame na poskytovanie rezervačnej služby, komunikáciu a v súlade so zákonnou povinnosťou. Spracovanie pre rezervácie je založené na plnení zmluvy alebo oprávnenom záujme; marketing len so súhlasom.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold mt-4">4. Súbory cookie</h2>
              <p>Používame nevyhnutné cookies na fungovanie stránky a prihlásenia. Voliteľne analytické a marketingové cookies podľa vášho výberu v lište súhlasu s cookies.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold mt-4">5. Zdieľanie a spracovatelia</h2>
              <p>Údaje môžu byť spracované technickými spracovateľmi (hosting, autentifikácia). Rezervačný systém a prihlásenie využívajú služby Supabase; prihlásenie cez Google/Apple podlieha ich zásadám. Nepredávame údaje tretím stranám na marketing.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold mt-4">6. Doba uchovávania</h2>
              <p>Údaje uchovávame po dobu potrebnú na plnenie zmluvy a zákonné povinnosti; po tej dobe sú anonymizované alebo vymazané.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold mt-4">7. Vaše práva</h2>
              <p>Máte právo na prístup, opravu, vymazanie, obmedzenie spracovania a sťažnosť u dozorného úradu. Kontaktujte nás e-mailom alebo cez stránku.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold mt-4">8. Zmeny</h2>
              <p>Zásady môžeme aktualizovať; zmeny zverejníme na tejto stránke s uvedením dátumu.</p>
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

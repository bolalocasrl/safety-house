import { TestataPagina, SchedeContatori, ElencoRighe } from '@/components/scheletro'

// Il profilo del candidato apre con le schede di punteggio e prosegue con le
// sezioni del fascicolo: lo scheletro ricalca quella sequenza.
export default function Caricamento() {
  return (
    <div>
      <TestataPagina />
      <SchedeContatori quante={2} />
      <ElencoRighe righe={4} />
    </div>
  )
}

import Anthropic from '@anthropic-ai/sdk'
import { AnthropicConfig } from './config'
import { RECEIPT_CATEGORIES, normalizeReceipt, ExtractedReceipt } from './receipt-normalize'

export { RECEIPT_CATEGORIES, ALLOWED_RECEIPT_MIME, normalizeReceipt } from './receipt-normalize'
export type { ExtractedReceipt } from './receipt-normalize'

/** Ruft Claude (Vision) auf und lässt Betrag/Datum/Kategorie/Beschreibung aus dem Beleg erfassen. */
export async function extractReceipt(
  cfg: AnthropicConfig,
  file: { base64: string; mimeType: string },
): Promise<ExtractedReceipt> {
  const client = new Anthropic({ apiKey: cfg.apiKey })
  const isPdf = file.mimeType === 'application/pdf'

  const mediaBlock = isPdf
    ? { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: file.base64 } }
    : { type: 'image' as const, source: { type: 'base64' as const, media_type: file.mimeType as 'image/jpeg', data: file.base64 } }

  const response = await client.messages.create({
    model: cfg.model,
    max_tokens: 1024,
    tools: [{
      name: 'beleg_erfassen',
      description: 'Erfasst die Eckdaten eines Belegs / einer Rechnung für ein Imkerei-Kassenbuch.',
      input_schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          amount: { type: 'number', description: 'Gesamtbetrag / Bruttosumme als Zahl (Punkt als Dezimaltrennzeichen)' },
          date: { type: 'string', description: 'Belegdatum im Format YYYY-MM-DD' },
          category: { type: 'string', enum: [...RECEIPT_CATEGORIES], description: 'Passende Ausgaben-Kategorie' },
          description: { type: 'string', description: 'Kurzbeschreibung: Händler/Lieferant oder Zweck' },
          currency: { type: 'string', description: 'Währung, z.B. EUR' },
        },
        required: ['amount', 'category'],
      },
    }],
    tool_choice: { type: 'tool', name: 'beleg_erfassen' },
    messages: [{
      role: 'user',
      content: [
        mediaBlock,
        {
          type: 'text',
          text: 'Lies diesen Beleg aus und rufe das Tool "beleg_erfassen" auf. '
            + 'Betrag = Bruttosumme (Gesamtbetrag). Datum = Belegdatum als YYYY-MM-DD. '
            + 'Kategorie wählen: Material (Imkereibedarf, Gläser, Futter, Werkzeug, Kleinmaterial), '
            + 'Tierarzt (Medikamente/Behandlung gegen Varroa u.ä.), Ausrüstung (größere Geräte/Anschaffungen), '
            + 'Fahrt (Tanken/Fahrtkosten), sonst Sonstiges. Beschreibung = Händler oder Zweck.',
        },
      ],
    }],
  })

  const block = response.content.find(b => b.type === 'tool_use')
  if (!block || block.type !== 'tool_use') throw new Error('no_extraction')
  return normalizeReceipt(block.input)
}

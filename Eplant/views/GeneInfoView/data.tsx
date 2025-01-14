export type GeneFeature = {
  type:
    | 'exon'
    | 'CDS'
    | 'five_prime_UTR'
    | 'three_prime_UTR'
    | 'gene'
    | 'mRNA'
    | 'transcript_region'
  uniqueID: string
  start: number
  end: number
  subfeatures: GeneFeature[]
  strand: string
}

export type GeneInfoViewData = {
  name: string
  brief_description: string
  computational_description: string
  curator_summary: string
  location: string
  chromosome_start: number
  chromosome_end: number
  strand: string
  geneSequence: string
  geneticElementType:
    | 'protein_coding'
    | 'novel_transcribed_region'
    | 'non_coding'
  features: GeneFeature[]
  proteinSequence?: string
}

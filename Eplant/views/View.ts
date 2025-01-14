import GeneticElement from '@eplant/GeneticElement'
import { useAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import * as React from 'react'

export type ViewProps<T> = {
  activeData: T
  geneticElement: GeneticElement | null
}

type ViewAction<T, Action> = {
  render: (props: ViewProps<T>) => JSX.Element
  action: Action
}

// T must be serializable/deserializable with JSON.stringify/JSON.parse
export type View<T = any, Action = any> = {
  // loadEvent should be called to update the view's loading bar.
  // The input is a float between 0 and 1 which represents the fraction of the data
  // that has currently loaded.
  getInitialData?: (
    gene: GeneticElement | null,
    loadEvent: (amount: number) => void
  ) => Promise<T>
  reducer?: (state: T, action: Action) => T
  actions?: ViewAction<T, Action>[]
  // Validate props.activeData with the ZodType
  component: (props: ViewProps<T>) => JSX.Element | null
  icon?: () => JSX.Element
  readonly name: string
  readonly id: string
  citation?: (props: {gene: GeneticElement|null}) => JSX.Element
}

export enum ViewDataError {
  UNSUPPORTED_GENE = 'Unsupported gene',
  FAILED_TO_LOAD = 'Failed to load',
}

type ViewDataType<T> = {
  activeData: T | undefined
  loading: boolean
  error: ViewDataError | null
  loadingAmount: number
}
const viewData: { [key: string]: ReturnType<typeof atomWithStorage<ViewDataType<any>>> } = {}

const viewDataStorage = {
  getItem(key: string) {
    const storedValue = localStorage.getItem(key)
    if (storedValue === null) {
      throw new Error('no value stored')
    }
    return JSON.parse(storedValue)
  },
  setItem(key: string, value: ViewDataType<any>) {
    if (value.loading) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  },
  removeItem(key: string) {
    localStorage.removeItem(key)
  },
}

function getViewDataAtom<T, A>(view: View<T, A>, gene: GeneticElement | null): ReturnType<typeof atomWithStorage<ViewDataType<T>>> {
  const key = `${view.id}-${gene?.id ?? 'generic-view'}`
  if (!viewData[key])
    viewData[key] = atomWithStorage<ViewDataType<T>>(
      'view-data-' + key,
      {
        activeData: undefined,
        loading: false,
        error: null,
        loadingAmount: 0,
      },
      viewDataStorage
    )
  return viewData[key]
}

export function useViewData<T, Action>(view: View<T, Action>, gene: GeneticElement | null) {
  const [viewData, setViewData] = useAtom(getViewDataAtom<T, Action>(view, gene))

  React.useEffect(() => {
    ;(async () => {
      if (viewData.loading || viewData.activeData) return
      setViewData((viewData) => ({ ...viewData, loading: true }))
      try {
        const loader = gene?.species.api.loaders[view.id] ?? view.getInitialData
        if (!loader) {
          throw ViewDataError.UNSUPPORTED_GENE
        }
        // Guaranteed to work even though types are broken because if gene is null then view.getInitialData is always used
        const data = await loader(gene as GeneticElement, (amount) => {
          setViewData((viewData) => ({ ...viewData, loadingAmount: amount }))
      })
        setViewData((viewData) => ({ ...viewData, activeData: data }))
      } catch (e) {
        if (e instanceof Error) {
          setViewData((viewData) => ({ ...viewData, error: ViewDataError.FAILED_TO_LOAD }))
        }
        else {
          setViewData((viewData) => ({ ...viewData, error: e as ViewDataError }))
        }
      }
      setViewData((viewData) => ({ ...viewData, loading: false }))
    })()
  }, [view, gene])

  return {
    ...viewData, 
    dispatch(action: Action) { 
        setViewData(data => (data.activeData ? {
          ...data, 
          activeData: view.reducer ? view.reducer(data.activeData, action) : viewData.activeData
        } : data))
    }
  }
}
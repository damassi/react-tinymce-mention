import without from 'lodash.without'
import cloneDeep from 'lodash.clonedeep'
import camelCase from 'lodash.camelcase'
import last from '../utils/last'
import uid from '../utils/uid'

export const initialState = {
  asyncDataSource: false,
  dataSource: [],
  fetching: false,
  highlightIndex: 0,
  matchedSources: [],
  mentions: [],
  query: ''
}

const actionsMap = {

  finalizeSetup(state, action) {
    const { editor, dataSource } = action.payload

    return {
      editor,
      dataSource,
    }
  },

  fetching(state, action) {
    const { fetching } = action.payload

    return {
      fetching
    }
  },

  moveDown(state) {
    const { highlightIndex, matchedSources } = state
    const len = matchedSources && matchedSources.length

    const newIndex = highlightIndex < len - 1
      ? highlightIndex + 1
      : 0

    return {
      highlightIndex: newIndex
    }
  },

  moveUp(state) {
    const { highlightIndex, matchedSources } = state
    const len = matchedSources.length

    const newIndex = highlightIndex > 0
      ? highlightIndex - 1
      : len - 1

    return {
      highlightIndex: newIndex
    }
  },

  query(state, action) {
    const query = action.payload.query.toUpperCase()
    const mentions = state.mentions

    const dataSource = state.asyncDataSource
      ? action.payload.dataSource
      : state.dataSource

    const matchedSources = dataSource.filter(source => {
      if (query.length) {
        const noSpaceQuery = query.replace(/\s/g, '')
        return source.searchKey
          .toUpperCase()
          .replace(/\s/g, '')
          .includes(noSpaceQuery)
      }
    })

    const withoutCurrentMentions = matchedSources.filter(source => {
      return !mentions.some(mention => mention.searchKey === source.searchKey)
    })

    return {
      dataSource,
      highlightIndex: 0,
      fetching: false,
      matchedSources: withoutCurrentMentions,
      query
    }
  },

  remove(state, action) {
    const mentions = state.mentions
    const mention = action.payload.mention

    if (!mentions || mentions === []) {
      return {}
    }

    const foundMention = last(mentions.filter(source => {
      const { displayLabel } = source
      return displayLabel && displayLabel
        .toUpperCase()
        .includes(mention.toUpperCase())
    }))

    const updatedMentions = without(mentions, foundMention)

    return {
      matchedSources: [],
      mentions: updatedMentions
    }
  },

  resetMentions() {
    return {
      query: '',
      matchedSources: [],
      mentions: []
    }
  },

  resetQuery() {
    return {
      query: '',
      matchedSources: []
    }
  },

  select(state, action) {
    const { mentions, matchedSources, highlightIndex } = state
    const { payload } = action

    if (!matchedSources || !matchedSources.length) {
      return {}
    }

    const selectIndex = payload && payload.index
      ? payload.index
      : highlightIndex

    const updatedMentions = cloneDeep(mentions).concat([{
      ...matchedSources[selectIndex],
      tinymceId: uid('mention-'),
    }])

    return {
      matchedSources: [],
      mentions: updatedMentions
    }
  },

  syncEditorState(state, action) {
    const editorMentionIds = action.payload.mentionIds

    const filteredMentions = state.mentions.filter(mention => {
      return editorMentionIds.some(id => id === mention.tinymceId)
    })

    return filteredMentions.length
      ? { mentions: filteredMentions }
      : { mentions: [] }
  }
}

export default function mentionReducer(state = initialState, action) {
  const reduceFn = actionsMap[camelCase(action.type)]

  if (!reduceFn) {
    return state
  }

  return {
    ...state,
    ...reduceFn(state, action)
  }
}

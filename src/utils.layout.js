import _ from 'lodash'

export function getLayoutPathsState (obj, parentKey = '') {
  return _.flatMapDeep(obj, (value, key) => {
    const currentPath = parentKey ? `${parentKey}.${key}` : key
    if (_.isObject(value)) {
      return getLayoutPathsState(value, currentPath)
    } else {
      return { path: currentPath, state: value }
    }
  })
}

export const defaultLayout = {
  panes: {
    left: { opener: false, visible: false },
    top: { opener: false, visible: false },
    right: { opener: false, visible: false },
    bottom: { opener: false, visible: false },
  },
  fab: { visible: false }
}
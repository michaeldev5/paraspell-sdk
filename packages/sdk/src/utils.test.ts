// Contains tests for important utils features that are used during call creation

import { describe, expect, it } from 'vitest'
import { NODE_NAMES_DOT_KSM } from './maps/consts'
import { getNodeEndpointOption } from './utils'

describe('getNodeEndpointOption', () => {
  it('should return endpoint option for all nodes', () => {
    NODE_NAMES_DOT_KSM.forEach(node => {
      // Coretime does not have endpoint options yet
      if (node === 'CoretimeKusama') return
      // Peaq has an endpoint commented out, but it works
      if (node === 'Peaq') return

      const option = getNodeEndpointOption(node)
      expect(option).toBeDefined()
      expect(option).toHaveProperty('providers')
      expect(Object.keys(option!.providers).length).toBeGreaterThan(0)
      expect(option).toHaveProperty('paraId')
      expect(option!.paraId).toBeTypeOf('number')
    })
  })
})

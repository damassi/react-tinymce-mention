import invariant from 'invariant'

export default function getKeyCode(event) {
  invariant(event,
    'Error returning keyCode: `event` is undefined.'
  )

  return event.which || event.keyCode
}

import React, { useContext } from 'react'
import { jsx as emotion } from '@emotion/core'
import styled from '@emotion/styled'
import { ThemeProvider as EmotionProvider } from 'emotion-theming'
import { MDXProvider } from '@mdx-js/react'
import css from '@styled-system/css'
import merge from 'lodash.merge'
import get from 'lodash.get'

export { css } from '@styled-system/css'

// custom pragma
const spaceRegExp = /^[mp][trblxy]?$/

const getSpace = props => {
  if (!props) return undefined
  const styles = {}
  for (const key in props) {
    if (!spaceRegExp.test(key)) continue
    styles[key] = props[key]
  }
  return css(styles)
}

const hasSpace = props => {
  for (const key in props) {
    if (spaceRegExp.test(key)) return true
  }
  return false
}

const getCSS = props => {
  if (!props) return undefined
  if (!props.css && !hasSpace(props)) return undefined
  return theme => [
    typeof props.css === 'function'
      ? css(props.css(theme))(theme)
      : css(props.css)(theme),
    getSpace(props)(theme),
  ]
}

const system = (type, props, ...children) =>
  React.createElement.apply(undefined, [
    type,
    {
      ...props,
      css: getCSS(props)
    },
    ...children
  ])

// compose createElement functions
const compose = (...funcs) => (type, props, ...children) => {
  return funcs.reduce((el, fn) => {
    return fn.apply(undefined, [ el.type, el.props, ...children ])
  }, React.createElement.apply(undefined, [ type, props, ...children ]))
}

export const jsx = compose(
  system,
  emotion
)

const tags = [
  'p',
  'a',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'img',
  'pre',
  'code',
  'ol',
  'ul',
  'li',
  'blockquote',
  'hr',
  'em',
  'table',
  'tr',
  'th',
  'td',
  'em',
  'strong',
  'delete',
  // mdx
  'inlineCode',
  'thematicBreak',
  // other
  'div',
  // theme-ui
  'root',
]

const aliases = {
  inlineCode: 'code',
  thematicBreak: 'hr',
  root: 'div',
}

const alias = n => aliases[n] || n

const themed = key => theme => css(get(theme, `styles.${key}`))(theme)

export const Styled = React.forwardRef(({
  tag = 'div',  // tag is used as a key in theme.styles
  as,           // as replaces the rendered element type
  ...props
}, ref) =>
  // why doesn't jsx work here? function call?
  jsx(as || alias(tag), {
    ...props,
    ref,
    css: themed(tag)
  })
)

const components = {}
tags.forEach(tag => {
  components[tag] = styled(alias(tag))(props => themed(tag)(props.theme))
  Styled[tag] = React.forwardRef((props, ref) =>
    jsx(Styled, { ref, tag, ...props })
  )
})

export const Context = React.createContext({
  theme: {},
  components,
})

const createComponents = (components = {}) => {
  const next = {}
  Object.keys(components).forEach(key => {
    next[key] = styled(components[key])(props => themed(key)(props.theme))
  })
  return next
}

export const ComponentProvider = ({
  theme,
  components,
  ...props
}) => {
  const outer = useContext(Context)
  const context = merge({}, outer, {
    theme,
    components: createComponents(components),
  })

  return (
    jsx(EmotionProvider, { theme: context.theme },
      jsx(MDXProvider, { components: context.components },
        jsx(Context.Provider, {
          value: context,
          children: props.children
        })
      )
    )
  )
}

////////
// Potentially remove this
export const useComponents = () => {
  const context = useContext(Context)
  return context.components
}

// This could be removed, but keeping the theme-ui API intact
export const ThemeProvider = props =>
  jsx(ComponentProvider, props)

import compose from 'koa-compose'
import merge from '@ianwalter/merge'

const noOp = () => {}

export default class Router {
  constructor (base) {
    this.routes = {}
    this.base = base
  }

  // Splits the route into an array of parts filtering out falsy/empty strings
  // unless its first (root).
  static getParts (path = '') {
    return path.split('/').filter((part, index) => part || index === 0)
  }

  add (path, ...middleware) {
    // Break down the path into parts so that they can be used to inform the
    // structure of the route tree.
    const parts = Router.getParts(path)

    const lastIndex = parts.length - 1
    parts.reduce(
      (acc, part, index) => {
        part = part === '' ? '$root' : part

        // If the part is prefaced by a colon, it's considered a URL parameter.
        let paramName
        if (part.indexOf(':') === 0) {
          paramName = part.substring(1)
          part = '$param'
        }

        // Extend the branch with the route part.
        const isLast = index === lastIndex
        const data = {
          ...paramName ? { name: paramName } : {},
          // If this is the last part of the URL, add the route data to it.
          ...isLast ? { path, parts, middleware: compose(middleware) } : {}
        }
        acc[part] = merge({}, acc[part], data)

        // Return the newly-added tip of the branch.
        return acc[part]
      },
      this.routes
    )
  }

  async match (ctx, next) {
    ctx.params = ctx.params || {}

    // If the URL is invalid, pass it to the next function if provided,
    // otherwise throw the error.
    let fullUrl
    try {
      fullUrl = new URL(ctx.url, this.base)
    } catch (err) {
      if (next) {
        return next(err)
      }
      throw err
    }

    // Traverse the route tree to find the matching route.
    let route
    try {
      const parts = Router.getParts(fullUrl.pathname)
      const lastIndex = parts.length - 1
      route = parts.reduce(
        (acc, part, index) => {
          part = part === '' ? '$root' : part

          const isLast = index === lastIndex
          if (isLast && acc[part]) {
            // Return the matched route.
            return acc[part]
          } else if (isLast && acc.$param) {
            // Add the URL parameter value to the context and return the matched
            // route.
            ctx.params[acc.$param.name] = part
            return acc.$param
          } else if (acc[part]) {
            // Return the tip of the branch.
            return acc[part]
          } else if (acc.$param) {
            // Add the URL parameter value to the context and return the tip of
            // the branch.
            ctx.params[acc.$param.name] = part
            return acc.$param
          }
        },
        this.routes
      )
    } catch (err) {
      // This is just to short-circuit reduce when a path is not found.
    }

    if (route) {
      // If a route was found, execute it's middleware.
      return route.middleware(ctx, next || noOp)
    } else if (next) {
      return next(ctx)
    }
  }
}

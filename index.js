import compose from 'koa-compose'
import merge from '@ianwalter/merge'

const noOp = () => {}

export default class Router {
  constructor (base) {
    this.routes = {}
    this.base = base
    this.middleware = []
  }

  // Splits the route into an array of parts filtering out falsy/empty strings
  // unless its first (root).
  static getParts (path = '') {
    return path.split('/').filter((part, index) => part || index === 0)
  }

  add (path, ...middleware) {
    if (typeof path === 'function') {
      this.middleware.push(path, ...middleware)
      this.composedMiddleware = compose(this.middleware)
    } else {
      // Break down the path into parts so that they can be used to inform the
      // structure of the route tree.
      const parts = Router.getParts(path)

      const lastIndex = parts.length - 1
      parts.reduce(
        (acc, part, index) => {
          part = part === '' ? '$root' : part

          // If the part is prefaced by a colon, it's considered a URL
          // parameter.
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
            ...isLast
              ? {
                path,
                parts,
                middleware: compose([...this.middleware, ...middleware])
              }
              : {}
          }
          acc[part] = merge({}, acc[part], data)

          // Return the newly-added tip of the branch.
          return acc[part]
        },
        this.routes
      )
    }
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

    // Break down the passed route into parts so that they can be used to
    // match the branches in the route tree.
    const parts = Router.getParts(fullUrl.pathname)
    const lastIndex = parts.length - 1

    let route = this.routes
    for (let [index, part] of parts.entries()) {
      const isLast = index === lastIndex

      // If the part is an empty string, it is the root of the tree.
      part = part === '' ? '$root' : part

      if (isLast && route[part]) {
        // Set the matched route.
        route = route[part]
      } else if (isLast && route.$param) {
        // Add the URL parameter value to the context and return the matched
        // route.
        ctx.params[route.$param.name] = part

        route = route.$param
      } else if (route[part]) {
        // Return the tip of the branch.
        route = route[part]
      } else if (route.$param) {
        // Add the URL parameter value to the context and return the tip of
        // the branch.
        ctx.params[route.$param.name] = part

        route = route.$param
      } else {
        route = false
        break
      }
    }

    if (route && route.middleware) {
      // If a route was found and has middleware (not an intermediary route),
      // execute it's middleware.
      return route.middleware(ctx, next || noOp)
    } else if (this.composedMiddleware) {
      return this.composedMiddleware(ctx, next || noOp)
    } else if (next) {
      return next(ctx)
    }
  }
}

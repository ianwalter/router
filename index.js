import compose from 'koa-compose'

const noOp = () => {}

export default class Router {
  constructor (base) {
    this.routes = {}
    this.base = base
  }

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

        // If the part isn't already part of the current branch, add it with the
        // parameter name if defined.
        const isLast = index === lastIndex
        if (!acc[part]) {
          acc[part] = {
            ...paramName ? { name: paramName } : {},
            // If this is the last part of the URL, add the route data to it.
            ...isLast ? { path, parts, middleware: compose(middleware) } : {}
          }
        }

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

    const parts = Router.getParts(fullUrl.pathname)
    const lastIndex = parts.length - 1

    // Traverse the route tree to find the matching route.
    const route = parts.reduce(
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

    if (route && route.middleware) {
      // If a route was found, execute it's middleware.
      return route.middleware(ctx, next || noOp)
    } else if (next) {
      return next()
    }
  }
}

import compose from 'koa-compose'

export default class Router {
  constructor (base) {
    this.routes = {}
    this.base = base
  }

  add (path, ...middleware) {
    // Break down the path into parts so that they can be used to inform the
    // structure of the route tree.
    const parts = path.split('/').filter(part => part)
    const lastIndex = parts.length - 1
    parts.reduce(
      (acc, part, index) => {
        // If the part is prefaced by a colon, it's considered a URL parameter.
        let paramName
        if (part.indexOf(':') === 0) {
          paramName = part.substring(1)
          part = '$param'
        }

        // If the part isn't already part of the current branch, add it with the
        // parameter name if defined.
        if (!acc[part]) {
          acc[part] = { ...paramName ? { name: paramName } : {} }
        }

        // If this is the last part of the URL, add the route object to it.
        if (index === lastIndex) {
          acc[part].$route = { path, parts, middleware: compose(middleware) }
        }

        // Return the newly-added tip of the branch.
        return acc[part]
      },
      this.routes
    )
  }

  async match (ctx, fallback) {
    ctx.url = ctx.url || new URL(ctx.request.url, this.base)
    ctx.params = ctx.params || {}
    const parts = ctx.url.pathname.split('/').filter(part => part)
    const lastIndex = parts.length - 1

    // Traverse the route tree to find the matching route.
    ctx.route = parts.reduce(
      (acc, part, index) => {
        const isLast = index === lastIndex
        if (isLast && acc[part] && acc[part].$route) {
          // Return the matched route.
          return acc[part].$route
        } else if (isLast && acc.$param && acc.$param.$route) {
          // Add the URL parameter value to the context and return the matched
          // route.
          ctx.params[acc.$param.name] = part
          return acc.$param.$route
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

    if (ctx.route && ctx.route.middleware) {
      // If a route was found, execute it's middleware.
      return new Promise((resolve, reject) => {
        const promise = ctx.route.middleware(ctx, err => {
          if (err) {
            return reject(err)
          }
          resolve(ctx)
        })

        if (promise && promise.then) {
          promise.then(() => resolve(ctx)).catch(reject)
        }
      })
    } else if (fallback) {
      return fallback(ctx)
    }
  }
}

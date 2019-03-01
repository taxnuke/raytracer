import { Intersectable } from './Intersectable'
import { Intersection } from './Intersection'
import { Ray } from './Ray'
import { Sphere } from './Sphere'
import { Vec3 } from './Vec3'

export class Renderer {
  private canvas: HTMLCanvasElement
  private imageWidth: number
  private imageHeight: number
  private fieldOfView: number = Math.PI / 2

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.canvas = canvas
    this.imageWidth = width * devicePixelRatio
    this.imageHeight = height * devicePixelRatio

    canvas.width = this.imageWidth
    canvas.height = this.imageHeight
    canvas.style.height = `${this.imageHeight / devicePixelRatio}px`
    canvas.style.width = `${this.imageWidth / devicePixelRatio}px`
  }

  public render() {
    const context = this.canvas.getContext('2d')
    const data = context.getImageData(0, 0, this.imageWidth, this.imageHeight)
    data.data.fill(255)

    const camOrigin = new Vec3(0, 0, -10)
    const camTarget = new Vec3(0, 0, 0)
    const camDirection = camTarget.sub(camOrigin)
    const camDirectionNormalized = camDirection.normalize()

    const bn = Vec3.globalUp.xProduct(camDirection).normalize()
    const vn = camDirectionNormalized.xProduct(bn)

    const aspectRatio = this.imageHeight / this.imageWidth

    const viewportHalfWidth = Math.tan(this.fieldOfView / 2)
    const viewportHalfHeight = viewportHalfWidth * aspectRatio

    const viewportWidth = 2 * viewportHalfWidth
    const shiftX = bn.scale(viewportWidth / (this.imageWidth - 1))

    const viewportHeight = 2 * viewportHalfHeight
    const shiftY = vn.scale(viewportHeight / (this.imageHeight - 1))

    const leftBottomPixelCenter = camDirectionNormalized
      .sub(bn.scale(viewportHalfWidth))
      .sub(vn.scale(viewportHalfHeight))

    for (let x = 0; x < this.imageWidth; x++) {
      for (let y = 0; y < this.imageHeight; y++) {
        const nextPixelCenter = leftBottomPixelCenter
          .add(shiftX.scale(x - 1))
          .add(shiftY.scale(y - 1))
          .normalize()

        const colorVector = traceRay.call(this, new Ray(
          camOrigin, nextPixelCenter),
        )

        const byte = (x * 4) + (y * this.imageWidth * 4)
        data.data[byte + 0] = colorVector.x
        data.data[byte + 1] = colorVector.y
        data.data[byte + 2] = colorVector.z
      }
    }

    context.putImageData(data, 0, 0)

    function traceRay(ray: Ray) {
      let closest: Intersection = null

      const objects: Intersectable[] = [
        new Sphere(new Vec3(0, 0, 0), 3),
      ]

      for (const object of objects) {
        const intersection = object.checkIntersection(ray)

        if (!closest || (intersection && closest.dist > intersection.dist)) {
          closest = intersection
        }
      }

      if (!closest) {
        return new Vec3()
      }

      return this.shade(closest)
    }
  }

  public shade(intersection: Intersection): Vec3 {
    const redColor = new Vec3(244, 67, 54)

    const light = {
      origin: new Vec3(-6, -5, -10),
      power: 150,
      target: intersection.object.origin,
    }

    const { ray, dist, object } = intersection

    const intersectionPoint = ray.origin.add(ray.direction.scale(dist))
    const normal = object.normal(intersectionPoint)

    const diffused = diffuse()

    return redColor.scale(diffused)

    function diffuse() {
      const lightDistance = object.origin.sub(light.origin).calcNorm()
      const inverseSquareCoeff = (lightDistance ** -2) * light.power
      const lightDirection = light.target.sub(light.origin).normalize()
      const intensity = lightDirection.dotProduct(normal) * inverseSquareCoeff

      return Math.min(1, intensity)
    }
  }
}
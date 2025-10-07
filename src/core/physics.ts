// Physics engine integration (Rapier)

import RAPIER from '@dimforge/rapier3d-compat';
import type { Vec3 } from '../types';

export class PhysicsWorld {
  private world: RAPIER.World;
  private rapier: typeof RAPIER;
  public isReady: boolean = false;

  constructor() {
    this.rapier = RAPIER;
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.isReady = true;
  }

  static async create(): Promise<PhysicsWorld> {
    await RAPIER.init();
    return new PhysicsWorld();
  }

  public step(deltaTime: number): void {
    this.world.step();
  }

  public createGround(): RAPIER.RigidBody {
    const groundDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0);
    const ground = this.world.createRigidBody(groundDesc);
    
    const groundCollider = RAPIER.ColliderDesc.cuboid(10000, 0.5, 10000);
    this.world.createCollider(groundCollider, ground);
    
    return ground;
  }

  public createDynamicBox(position: Vec3, size: Vec3, mass: number = 1): RAPIER.RigidBody {
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z);
    const body = this.world.createRigidBody(bodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2)
      .setDensity(mass);
    this.world.createCollider(colliderDesc, body);

    return body;
  }

  public createStaticBox(position: Vec3, size: Vec3, rotation: number = 0): RAPIER.RigidBody {
    const bodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(position.x, position.y, position.z)
      .setRotation({ x: 0, y: rotation, z: 0, w: 1 });
    const body = this.world.createRigidBody(bodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2);
    this.world.createCollider(colliderDesc, body);

    return body;
  }

  public removeBody(body: RAPIER.RigidBody): void {
    this.world.removeRigidBody(body);
  }

  public getWorld(): RAPIER.World {
    return this.world;
  }

  public dispose(): void {
    this.world.free();
  }
}


// Mini-map rendering using 2D canvas

import type { VehicleState, ChunkData } from '../types';
import { CHUNK_SIZE } from '../utils/math';

export class MiniMap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scale: number = 2; // pixels per meter
  private radius: number = 150; // meters to display

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = 300;
    this.canvas.height = 300;
    this.ctx = canvas.getContext('2d')!;

    // Style the canvas
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '20px';
    this.canvas.style.right = '20px';
    this.canvas.style.border = '3px solid #333';
    this.canvas.style.borderRadius = '8px';
    this.canvas.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  }

  public update(vehicleState: VehicleState, chunks: Map<string, any>): void {
    // Clear canvas
    this.ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // Save context for rotation
    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate(-vehicleState.rotation); // Rotate map with vehicle

    // Draw roads from loaded chunks
    this.ctx.strokeStyle = '#666';
    this.ctx.lineWidth = 3;

    chunks.forEach((chunk) => {
      const chunkData: ChunkData = chunk.data;
      
      chunkData.roads.forEach(road => {
        this.ctx.beginPath();
        road.segments.forEach((segment, i) => {
          const x = (segment.x - vehicleState.position.x) * this.scale;
          const y = (segment.y - vehicleState.position.z) * this.scale;
          
          if (i === 0) {
            this.ctx.moveTo(x, y);
          } else {
            this.ctx.lineTo(x, y);
          }
        });
        
        // Color by road type
        if (road.type === 'primary') {
          this.ctx.strokeStyle = '#888';
          this.ctx.lineWidth = 4;
        } else {
          this.ctx.strokeStyle = '#666';
          this.ctx.lineWidth = 2;
        }
        
        this.ctx.stroke();
      });
    });

    // Draw buildings as small dots
    this.ctx.fillStyle = 'rgba(100, 100, 100, 0.6)';
    chunks.forEach((chunk) => {
      const chunkData: ChunkData = chunk.data;
      
      chunkData.buildings.forEach(building => {
        const footprint = building.footprint;
        if (footprint.length < 3) return;

        const minX = Math.min(...footprint.map(p => p.x));
        const maxX = Math.max(...footprint.map(p => p.x));
        const minY = Math.min(...footprint.map(p => p.y));
        const maxY = Math.max(...footprint.map(p => p.y));
        
        const centerBldgX = (minX + maxX) / 2;
        const centerBldgZ = (minY + maxY) / 2;
        const width = (maxX - minX) * this.scale;
        const height = (maxY - minY) * this.scale;

        const x = (centerBldgX - vehicleState.position.x) * this.scale;
        const y = (centerBldgZ - vehicleState.position.z) * this.scale;

        this.ctx.fillRect(x - width / 2, y - height / 2, width, height);
      });
    });

    // Restore context
    this.ctx.restore();

    // Draw player indicator (always at center, pointing up)
    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    
    this.ctx.fillStyle = '#ff4444';
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    
    this.ctx.beginPath();
    this.ctx.moveTo(0, -12);
    this.ctx.lineTo(-8, 8);
    this.ctx.lineTo(8, 8);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
    
    this.ctx.restore();

    // Draw border and scale
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw scale indicator
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '12px monospace';
    this.ctx.fillText(`${this.radius}m radius`, 10, this.canvas.height - 10);
  }
}


import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class Trial extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    trialText: Phaser.GameObjects.Text;

    constructor ()
    {
        super('Trial');
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x0066cc);

        this.background = this.add.image(512, 384, 'background');
        this.background.setAlpha(0.7);

        this.trialText = this.add.text(512, 384, 'Trial Scene\n\nThis is where the trial gameplay\nwould be implemented.', {
            fontFamily: 'Arial Black', fontSize: 32, color: '#ffffff',
            stroke: '#000000', strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        EventBus.emit('current-scene-ready', this);
    }

    gameOver ()
    {
        this.scene.start('GameOver');
    }
}

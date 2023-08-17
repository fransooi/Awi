package com.helloawi.awi;

public class MainLoop extends Thread
{
    private int FPS = 10;
    private MainActivity parent;
    private boolean running;

    public MainLoop( MainActivity parent )
    {
        super();
        this.parent = parent;
        this.running = false;
    }
    public void setRunning( boolean onOff )
    {
        if ( onOff != this.running )
        {
            this.running = onOff;
            if ( this.running )
            {
                this.start();
            }
        }

    }
    public void run()
    {
        int frameCount = 0;
        int interval = 500;

        while( running )
        {
            this.parent.update();
            this.parent.handleWebSocket( this.parent );
            this.parent.handleAsk( this.parent );

            try
            {
                this.sleep( interval );
            }
            catch( Exception e )
            {
                e.printStackTrace();
            }
        }
    }
}

﻿param(
    [string]$app, 
    [string]$testDir, 
    [string]$teamApiKey,
    [string]$user,
    [string]$devices,
    [string]$series, 
    [string]$locale,
    [string]$testCloudLocation,
    [string]$parallelization,
    [string]$optionalArgs
)

Write-Verbose "Entering script XamarinTestCloud.ps1"
Write-Verbose "app = $app"
Write-Verbose "testDir = $testDir"
Write-Verbose "teamApiKey = $teamApiKey"
Write-Verbose "user = $user"
Write-Verbose "devices = $devices"
Write-Verbose "series = $series"
Write-Verbose "locale = $locale"
Write-Verbose "testCloudLocation = $testCloudLocation"
Write-Verbose "parallelization = $parallelization"
Write-Verbose "optionalArgs = $optionalArgs"

# Import the Task.Common dll that has all the cmdlets we need for Build
import-module "Microsoft.TeamFoundation.DistributedTask.Task.Common"

$parameters = ""

if (!$teamApiKey) 
{
    throw "Must specify a Team API key."
}

if (!$user)
{
    throw "Must specify a user for this test run."
}
$parameters = "$parameters --user $user"

if (!$devices)
{
    throw "Must specify devices to run the tests on."
}
$parameters = "$parameters --devices $devices"

if (!$series) 
{
    throw "Must specify the series."
}
$parameters = "$parameters --series `"$series`""

if (!$locale) 
{
    throw "Must specify the system language."
}
$parameters = "$parameters --locale `"$locale`""

# check for app pattern
if ($app.Contains("*") -or $app.Contains("?"))
{
    Write-Verbose "Pattern found in app parameter. Calling Find-Files."
    Write-Verbose "Find-Files -SearchPattern $app"
    $appFiles = Find-Files -SearchPattern $app
    Write-Verbose "appFiles = $appFiles"
}
else
{
    Write-Verbose "No pattern found in app input."
    $appFiles = ,$app
}

if (!$appFiles)
{
    throw "No apps with search pattern '$app' was found."
}

# Xamarin.UITest specific options
if (!$testDir -or !(Test-Path -Path $testDir -PathType Container))
{
    throw "Test assembly directory does not exist or is not a folder."
}
$parameters = "$parameters --assembly-dir $testDir"

if ("none" -ne $parallelization)
{
    $parameters = "$parameters $parallelization"
}

# Ensure that $testCloudLocation specifies test-cloud.exe
if (!$testCloudLocation.EndsWith("test-cloud.exe", "OrdinalIgnoreCase"))
{
    throw "test-cloud.exe location must end with 'test-cloud.exe'."
}

# locate the test-cloud tool, it is part of the Xamarin.UITest NuGet package
if ($testCloudLocation.Contains("*") -or $testCloudLocation.Contains("?"))
{
    Write-Verbose "Find-Files -SearchPattern $testCloudLocation"
    $testCloudExectuables = Find-Files -SearchPattern $testCloudLocation
    Write-Verbose "testCloudExectuables = $testCloudExectuables"

    if ($testCloudExectuables)
    {
        foreach ($executable in $testCloudExectuables) 
        {
            $testCloud = $executable
            break;
        }
    }
}
else 
{
    if (Test-Path -Path $testCloudLocation --Type Leaf) 
    {
        $testCloud = $testCloudLocation 
    }
}

if (!$testCloud) 
{
    throw "Could not find test-cloud.exe.  If you don't have Xamarin Test Cloud command line tools installed, install the NuGet package Xamarin.UITest."  
}

if ($optionalArgs)
{
    $parameters = "$parameters $optionalArgs"
}

foreach ($ap in $appFiles)
{
    $argument = "submit $ap $teamApiKey $parameters"
    Write-Host "Submit $ap to Xamarin Test Cloud."
    Invoke-Tool -Path $testCloud -Arguments $argument
}

Write-Verbose "Leaving script XamarinTestCloud.ps1"
